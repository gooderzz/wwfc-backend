import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreatePaymentRecordDto, UpdatePaymentRecordDto, MarkPaymentPaidDto } from './dto/payment-record.dto';
import { PaymentType, PaymentStatus, PaymentMethod } from '@prisma/client';

@Injectable()
export class PaymentRecordService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: {
    userId?: number;
    paymentType?: PaymentType;
    status?: PaymentStatus;
    teamId?: number;
    dueDateFrom?: Date;
    dueDateTo?: Date;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.paymentType) {
      where.paymentType = filters.paymentType;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.dueDateFrom || filters?.dueDateTo) {
      where.dueDate = {};
      if (filters.dueDateFrom) {
        where.dueDate.gte = filters.dueDateFrom;
      }
      if (filters.dueDateTo) {
        where.dueDate.lte = filters.dueDateTo;
      }
    }

    // If filtering by team, we need to join with user's team
    if (filters?.teamId) {
      where.user = {
        teamId: filters.teamId,
      };
    }

    // Pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 25;
    const skip = (page - 1) * limit;

    // Get total count for pagination metadata
    const totalCount = await this.prisma.paymentRecord.count({ where });

    const records = await this.prisma.paymentRecord.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            team: {
              select: {
                id: true,
                name: true,
                division: true,
              },
            },
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            eventType: true,
          },
        },
        markedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
    });

    return {
      records,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  async findBySquarePaymentId(squarePaymentId: string) {
    const paymentRecord = await this.prisma.paymentRecord.findFirst({
      where: { squarePaymentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            team: {
              select: {
                id: true,
                name: true,
                division: true,
              },
            },
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            eventType: true,
          },
        },
        markedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return paymentRecord;
  }

  async findOne(id: string) {
    const paymentRecord = await this.prisma.paymentRecord.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            team: {
              select: {
                id: true,
                name: true,
                division: true,
              },
            },
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            eventType: true,
          },
        },
        markedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!paymentRecord) {
      throw new NotFoundException(`Payment record with ID ${id} not found`);
    }

    return paymentRecord;
  }

  async create(createPaymentRecordDto: CreatePaymentRecordDto, markedBy?: number) {
    const { amount, discountAmount = '0' } = createPaymentRecordDto;
    const finalAmount = parseFloat(amount) - parseFloat(discountAmount);

    if (finalAmount < 0) {
      throw new BadRequestException('Final amount cannot be negative');
    }

    // Create the payment record
    const paymentRecord = await this.prisma.paymentRecord.create({
      data: {
        userId: createPaymentRecordDto.userId,
        paymentType: createPaymentRecordDto.paymentType,
        amount: createPaymentRecordDto.amount,
        discountAmount: createPaymentRecordDto.discountAmount || '0',
        finalAmount: finalAmount.toString(),
        status: PaymentStatus.DUE,
        dueDate: new Date(createPaymentRecordDto.dueDate),
        eventId: createPaymentRecordDto.eventId,
        fixtureId: createPaymentRecordDto.fixtureId,
        matchMinutes: createPaymentRecordDto.matchMinutes,
        paymentMethod: createPaymentRecordDto.paymentMethod || 'MANUAL',
        notes: createPaymentRecordDto.notes,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            eventType: true,
          },
        },
      },
    });

    // Check if user has available credit and automatically allocate it
    await this.allocateAvailableCredit(createPaymentRecordDto.userId, paymentRecord.id);

    return paymentRecord;
  }

  /**
   * Allocate any available credit to a payment record
   */
  private async allocateAvailableCredit(userId: number, paymentRecordId: string) {
    // Get the newly created payment record to check if it's a credit record
    const newPaymentRecord = await this.prisma.paymentRecord.findUnique({
      where: { id: paymentRecordId },
    });

    // Skip allocation if the newly created record is a credit record
    if (newPaymentRecord && newPaymentRecord.paymentType === 'SOCIAL_EVENT' && newPaymentRecord.notes?.includes('credit')) {
      console.log(`Skipping credit allocation for credit record ${paymentRecordId}`);
      return;
    }

    // Get all payment records for the user EXCEPT the one we just created
    const existingPayments = await this.prisma.paymentRecord.findMany({
      where: { 
        userId,
        id: { not: paymentRecordId } // Exclude the newly created record
      },
    });

    // Calculate current balance from existing records only
    let totalOwed = 0;
    let totalPaid = 0;

    existingPayments.forEach((record) => {
      const finalAmount = parseFloat(record.finalAmount.toString());
      const paidAmount = parseFloat(record.paidAmount?.toString() || '0');
      
      // Skip credit records when calculating total owed
      if (record.paymentType === 'SOCIAL_EVENT' && record.notes?.includes('credit')) {
        totalPaid += paidAmount;
        return;
      }

      totalOwed += finalAmount;
      totalPaid += paidAmount;
    });

    const availableCredit = totalPaid - totalOwed;

    // If there's available credit, allocate it to the new payment record
    if (availableCredit > 0) {
      if (newPaymentRecord && newPaymentRecord.status === 'DUE') {
        const finalAmount = parseFloat(newPaymentRecord.finalAmount.toString());
        const amountToAllocate = Math.min(availableCredit, finalAmount);
        const newPaidAmount = amountToAllocate;
        const isFullPayment = newPaidAmount >= finalAmount;

        // Update the payment record with the allocated credit
        await this.prisma.paymentRecord.update({
          where: { id: paymentRecordId },
          data: {
            status: isFullPayment ? 'PAID' : 'PARTIAL',
            paidAmount: newPaidAmount.toString(),
            paidDate: isFullPayment ? new Date() : null,
            paymentMethod: 'CREDIT_ALLOCATION',
            notes: `Automatic credit allocation: £${amountToAllocate.toFixed(2)}${newPaymentRecord.notes ? ` | ${newPaymentRecord.notes}` : ''}`,
          },
        });

        // REDUCE THE CREDIT RECORDS by the allocated amount
        await this.reduceCreditRecords(userId, amountToAllocate);

        console.log(`Automatically allocated £${amountToAllocate.toFixed(2)} credit to payment record ${paymentRecordId}`);
      }
    }
  }

  /**
   * Reduce credit records by the allocated amount
   */
  private async reduceCreditRecords(userId: number, amountToReduce: number) {
    // Get all credit records for the user
    const creditRecords = await this.prisma.paymentRecord.findMany({
      where: {
        userId,
        paymentType: 'SOCIAL_EVENT',
        notes: { contains: 'credit' },
      },
      orderBy: { createdAt: 'asc' }, // Reduce oldest credits first
    });

    let remainingAmountToReduce = amountToReduce;

    for (const creditRecord of creditRecords) {
      if (remainingAmountToReduce <= 0) break;

      const currentCreditAmount = parseFloat(creditRecord.paidAmount?.toString() || '0');
      const amountToReduceFromThisRecord = Math.min(remainingAmountToReduce, currentCreditAmount);
      const newCreditAmount = currentCreditAmount - amountToReduceFromThisRecord;

      // Update the credit record
      await this.prisma.paymentRecord.update({
        where: { id: creditRecord.id },
        data: {
          paidAmount: newCreditAmount.toString(),
          notes: `Balance payment credit: £${newCreditAmount.toFixed(2)} (reduced by £${amountToReduceFromThisRecord.toFixed(2)})`,
        },
      });

      remainingAmountToReduce -= amountToReduceFromThisRecord;
      console.log(`Reduced credit record ${creditRecord.id} by £${amountToReduceFromThisRecord.toFixed(2)}`);
    }
  }

  async update(id: string, updatePaymentRecordDto: UpdatePaymentRecordDto) {
    const existingRecord = await this.prisma.paymentRecord.findUnique({
      where: { id },
    });

    if (!existingRecord) {
      throw new NotFoundException(`Payment record with ID ${id} not found`);
    }

    return this.prisma.paymentRecord.update({
      where: { id },
      data: updatePaymentRecordDto,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            eventType: true,
          },
        },
        markedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async markAsPaid(id: string, markPaymentPaidDto: MarkPaymentPaidDto, markedBy: number) {
    const existingRecord = await this.prisma.paymentRecord.findUnique({
      where: { id },
    });

    if (!existingRecord) {
      throw new NotFoundException(`Payment record with ID ${id} not found`);
    }

    if (existingRecord.status === PaymentStatus.PAID) {
      throw new BadRequestException('Payment is already marked as paid');
    }

    return this.prisma.paymentRecord.update({
      where: { id },
      data: {
        status: PaymentStatus.PAID,
        paidDate: new Date(),
        paymentMethod: markPaymentPaidDto.paymentMethod,
        squarePaymentId: markPaymentPaidDto.squarePaymentId,
        markedBy,
        notes: markPaymentPaidDto.notes,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            eventType: true,
          },
        },
        markedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async bulkMarkAsPaid(ids: string[], markPaymentPaidDto: MarkPaymentPaidDto, markedBy: number) {
    const records = await this.prisma.paymentRecord.findMany({
      where: { id: { in: ids } },
    });

    if (records.length !== ids.length) {
      throw new BadRequestException('Some payment records not found');
    }

    const results = await Promise.all(
      ids.map(id => this.markAsPaid(id, markPaymentPaidDto, markedBy))
    );

    return results;
  }

  async delete(id: string) {
    const existingRecord = await this.prisma.paymentRecord.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!existingRecord) {
      throw new NotFoundException(`Payment record with ID ${id} not found`);
    }

    // Process operations sequentially for better pooler compatibility
    // If the fee was already paid, we need to credit the user's balance
    if (existingRecord.status === PaymentStatus.PAID && parseFloat(existingRecord.paidAmount.toString()) > 0) {
      const paidAmount = parseFloat(existingRecord.paidAmount.toString());
      
      // Create a credit record to refund the paid amount
      await this.prisma.paymentRecord.create({
        data: {
          userId: existingRecord.userId,
          paymentType: PaymentType.SOCIAL_EVENT, // Using SOCIAL_EVENT for credit records
          amount: 0,
          discountAmount: 0,
          finalAmount: paidAmount,
          paidAmount: paidAmount,
          status: PaymentStatus.PAID,
          dueDate: new Date(),
          paidDate: new Date(),
          paymentMethod: PaymentMethod.MANUAL,
          notes: `Fee deletion refund - ${existingRecord.paymentType} (${existingRecord.id})`,
          markedBy: existingRecord.markedBy,
        },
      });
    }

    // Delete the original payment record
    return this.prisma.paymentRecord.delete({
      where: { id },
    });
  }

  async updateOverdueStatus() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.prisma.paymentRecord.updateMany({
      where: {
        status: PaymentStatus.DUE,
        dueDate: {
          lt: thirtyDaysAgo,
        },
      },
      data: {
        status: PaymentStatus.OVERDUE,
      },
    });
  }
}
