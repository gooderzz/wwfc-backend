import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PaymentRecordService } from './payment-record.service';
import { SquareService } from './square.service';
import { CreateBalancePaymentDto } from './dto/balance-payment.dto';

@Injectable()
export class BalancePaymentService {
  private readonly logger = new Logger(BalancePaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentRecordService: PaymentRecordService,
    private readonly squareService: SquareService,
  ) {}

  /**
   * Get user's current balance and due payments
   */
  async getUserBalanceSummary(userId: number) {
    // Get all payment records for the user
    const allPaymentsResponse = await this.paymentRecordService.findAll({
      userId,
    });

    // Handle new paginated response format
    const allPayments = allPaymentsResponse.records || allPaymentsResponse;

    // Calculate total amount owed (sum of finalAmount from fee records only, exclude credits)
    const totalOwed = allPayments.reduce((sum: number, record: any) => {
      // Skip credit records (SOCIAL_EVENT with credit notes)
      if (record.paymentType === 'SOCIAL_EVENT' && record.notes?.includes('credit')) {
        return sum;
      }
      const finalAmount = parseFloat(record.finalAmount.toString());
      return sum + finalAmount;
    }, 0);

    // Calculate total amount paid (sum of all paidAmount, including credits)
    const totalPaid = allPayments.reduce((sum: number, record: any) => {
      const paidAmount = parseFloat(record.paidAmount?.toString() || '0');
      return sum + paidAmount;
    }, 0);

    // Calculate current balance: total paid minus total owed
    const currentBalance = totalPaid - totalOwed;

    // Filter for DUE, PARTIAL, and OVERDUE records for total due calculation
    const filteredDuePayments = allPayments.filter((record: any) => 
      ['DUE', 'PARTIAL', 'OVERDUE'].includes(record.status)
    );

    // Calculate total amount due (remaining amounts on unpaid/partial records)
    const totalDue = filteredDuePayments.reduce((sum: number, record: any) => {
      const finalAmount = parseFloat(record.finalAmount.toString());
      const paidAmount = parseFloat(record.paidAmount?.toString() || '0');
      return sum + (finalAmount - paidAmount);
    }, 0);

    return {
      userId,
      currentBalance: currentBalance,
      totalDue: totalDue,
      duePayments: filteredDuePayments,
      canPayBalance: totalDue > 0,
    };
  }

  /**
   * Process a balance-based payment
   */
  async processBalancePayment(userId: number, createBalancePaymentDto: CreateBalancePaymentDto) {
    const { sourceId, amount, currency = 'GBP' } = createBalancePaymentDto;
    
    this.logger.log(`Processing balance payment for user ${userId}: £${amount}`);

    // Get user's current balance and due payments
    const balanceSummary = await this.getUserBalanceSummary(userId);
    
    if (!balanceSummary.canPayBalance) {
      throw new BadRequestException('No payments are currently due');
    }

    const paymentAmount = parseFloat(amount.toString());
    const currentBalance = balanceSummary.currentBalance;
    const totalDue = balanceSummary.totalDue;
    
    // Calculate how much of the payment goes to actual debt vs building credit
    const debtAmount = Math.min(paymentAmount, totalDue);
    const creditAmount = paymentAmount - debtAmount;

    this.logger.log(`Payment allocation: £${debtAmount} to debt, £${creditAmount} to credit`);

    // Create Square payment for the full amount
    const squarePayment = await this.squareService.createBalancePayment(
      sourceId,
      parseFloat(amount.toString()),
      currency,
      `Balance payment for user ${userId}`
    );

    if (squarePayment.status !== 'COMPLETED') {
      throw new BadRequestException('Payment was not completed successfully');
    }

    // Allocate the debt portion across due payments by due date
    if (debtAmount > 0) {
      await this.allocatePaymentToRecords(userId, debtAmount, squarePayment.id);
    }

    // Handle overpayment by creating a credit record
    if (creditAmount > 0) {
      const creditRecord = await this.paymentRecordService.create({
        userId,
        paymentType: 'SOCIAL_EVENT', // Using this as a catch-all for credits
        amount: creditAmount.toString(),
        discountAmount: '0',
        dueDate: new Date().toISOString(),
        paymentMethod: 'SQUARE',
        notes: `Balance payment credit: £${creditAmount.toFixed(2)}`,
      });

      // Mark the credit record as paid immediately
      await this.paymentRecordService.update(creditRecord.id, {
        status: 'PAID',
        paidDate: new Date().toISOString(),
        squarePaymentId: squarePayment.id,
        paidAmount: creditAmount.toString(),
      });
    }

    // Get updated balance summary after the payment
    const updatedBalanceSummary = await this.getUserBalanceSummary(userId);

    return {
      squarePaymentId: squarePayment.id,
      totalPaid: paymentAmount,
      debtPaid: debtAmount,
      creditAdded: creditAmount,
      newBalance: updatedBalanceSummary.currentBalance,
      allocatedRecords: debtAmount > 0 ? updatedBalanceSummary : null,
    };
  }

  /**
   * Allocate payment amount across due payment records by due date priority
   */
  private async allocatePaymentToRecords(userId: number, amount: number, squarePaymentId: string) {
    // Get all payment records for the user, then filter for DUE, PARTIAL, and OVERDUE
    const allUserPaymentsResponse = await this.paymentRecordService.findAll({
      userId,
    });

    // Handle new paginated response format
    const allUserPayments = allUserPaymentsResponse.records || allUserPaymentsResponse;

    // Filter for DUE, PARTIAL, and OVERDUE records
    const filteredDuePayments = allUserPayments.filter((record: any) => 
      ['DUE', 'PARTIAL', 'OVERDUE'].includes(record.status)
    );

    let remainingAmount = amount;
    const allocationResults = [];

    for (const record of filteredDuePayments) {
      if (remainingAmount <= 0) break;

      const finalAmount = parseFloat(record.finalAmount.toString());
      const currentPaidAmount = parseFloat(record.paidAmount?.toString() || '0');
      const remainingOnRecord = finalAmount - currentPaidAmount;

      if (remainingOnRecord <= 0) continue;

      // Calculate how much to pay on this record
      const amountToPay = Math.min(remainingAmount, remainingOnRecord);
      const newPaidAmount = currentPaidAmount + amountToPay;
      const isFullPayment = newPaidAmount >= finalAmount;

      // Update the payment record
      await this.paymentRecordService.update(record.id, {
        status: isFullPayment ? 'PAID' : 'PARTIAL',
        paidAmount: newPaidAmount.toString(),
        paidDate: isFullPayment ? new Date().toISOString() : undefined,
        paymentMethod: 'SQUARE',
        squarePaymentId: squarePaymentId,
        notes: `Balance payment allocation: £${amountToPay.toFixed(2)} (total paid: £${newPaidAmount.toFixed(2)})`,
      });

      allocationResults.push({
        recordId: record.id,
        amountPaid: amountToPay,
        recordStatus: isFullPayment ? 'PAID' : 'PARTIAL',
        remainingOnRecord: remainingOnRecord - amountToPay,
      });

      remainingAmount -= amountToPay;
    }

    this.logger.log(`Allocated £${amount - remainingAmount} across ${allocationResults.length} records`);
    return allocationResults;
  }
}
