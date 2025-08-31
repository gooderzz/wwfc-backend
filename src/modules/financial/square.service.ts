import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { SquareClient } from 'square';
import { CreateSquarePaymentDto, SquarePaymentResponseDto } from './dto/square-payment.dto';
import { PaymentRecordService } from './payment-record.service';
import { UserBalanceService } from './user-balance.service';
import { squareConfig } from '../../config/square.config';

@Injectable()
export class SquareService {
  private readonly logger = new Logger(SquareService.name);
  private client: SquareClient | null = null;

  constructor(
    private readonly paymentRecordService: PaymentRecordService,
    private readonly userBalanceService: UserBalanceService,
  ) {}

  private getClient(): SquareClient {
    if (!this.client) {
      this.logger.debug(`Initializing Square client with token: ${squareConfig.accessToken.substring(0, 20)}...`);
      this.logger.debug(`Full token length: ${squareConfig.accessToken.length}`);
      this.logger.debug(`Token starts with: ${squareConfig.accessToken.substring(0, 10)}`);
      this.logger.debug(`Environment: ${squareConfig.environment === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com'}`);
      
      this.client = new SquareClient({
        token: squareConfig.accessToken,
        environment: squareConfig.environment === 'production' 
          ? 'https://connect.squareup.com' 
          : 'https://connect.squareupsandbox.com',
      });
      
      this.logger.debug('Square client initialized successfully');
    }
    return this.client;
  }

  async createPayment(createPaymentDto: CreateSquarePaymentDto): Promise<SquarePaymentResponseDto> {
    try {
      this.logger.debug(`Received payment request: ${JSON.stringify(createPaymentDto, null, 2)}`);
      
      const { sourceId, paymentRecordId, amount, currency = 'GBP', note } = createPaymentDto;

      // Validate payment record exists
      const paymentRecord = await this.paymentRecordService.findOne(paymentRecordId);
      if (!paymentRecord) {
        throw new BadRequestException(`Payment record with ID ${paymentRecordId} not found`);
      }

      this.logger.debug(`Creating Square payment for record ${paymentRecordId} with amount ${amount} ${currency}`);

      // Extract token from sourceId object
      let token: string;
      if (typeof sourceId === 'string') {
        token = sourceId;
      } else if (sourceId && typeof sourceId === 'object' && 'token' in sourceId) {
        token = (sourceId as any).token;
      } else {
        throw new Error('Invalid sourceId format - expected string or object with token property');
      }

      this.logger.debug(`Extracted token: ${token}`);

      // Create payment using the new Square SDK
      const paymentRequest = {
        sourceId: token,
        amountMoney: {
          amount: BigInt(Math.round(amount * 100)), // Convert to pence and use BigInt
          currency: currency.toUpperCase() as any,
        },
        idempotencyKey: `pay_${Date.now()}`,
        note: note || `Payment for record ${paymentRecordId}`,
      };
      
      this.logger.debug(`Payment request: ${JSON.stringify(paymentRequest, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value, 2)}`);
      
      const paymentResponse = await this.getClient().payments.create(paymentRequest);

      this.logger.debug(`Square payment created: ${paymentResponse.payment?.id}`);

      // Determine payment status based on amount paid vs final amount
      const finalAmount = parseFloat(paymentRecord.finalAmount.toString());
      const currentPaidAmount = parseFloat(paymentRecord.paidAmount?.toString() || '0');
      const paymentAmount = parseFloat(amount.toString());
      const newPaidAmount = currentPaidAmount + paymentAmount;
      const isFullPayment = newPaidAmount >= finalAmount;
      const isPartialPayment = newPaidAmount < finalAmount && paymentAmount > 0;
      
      let newStatus: any = 'DUE';
      if (paymentResponse.payment?.status === 'COMPLETED') {
        if (isFullPayment) {
          newStatus = 'PAID';
        } else if (isPartialPayment) {
          newStatus = 'PARTIAL';
        }
      }

      // Update payment record with Square payment ID and appropriate status
      await this.paymentRecordService.update(paymentRecordId, {
        squarePaymentId: paymentResponse.payment?.id,
        status: newStatus,
        paidDate: paymentResponse.payment?.status === 'COMPLETED' ? new Date().toISOString() : undefined,
        paymentMethod: 'SQUARE',
        paidAmount: newPaidAmount.toString(),
        notes: isPartialPayment ? `Partial payment of £${paymentAmount.toFixed(2)} (total paid: £${newPaidAmount.toFixed(2)}, remaining: £${(finalAmount - newPaidAmount).toFixed(2)})` : undefined,
      });

      // Update user balance only if payment is completed
      if (paymentResponse.payment?.status === 'COMPLETED') {
        this.logger.debug(`Updating user balance for user ${paymentRecord.userId} with amount -${amount}`);
        await this.userBalanceService.adjustBalance(paymentRecord.userId, {
          amount: `-${amount}`,
          reason: `Square payment: ${paymentResponse.payment.id}`,
        });
        this.logger.debug(`User balance updated successfully`);
      }

      return {
        id: paymentResponse.payment?.id || 'unknown',
        status: paymentResponse.payment?.status || 'UNKNOWN',
        amountMoney: {
          amount: Number(paymentResponse.payment?.amountMoney?.amount || 0),
          currency: paymentResponse.payment?.amountMoney?.currency || currency.toUpperCase(),
        },
        receiptUrl: paymentResponse.payment?.receiptUrl || '',
        createdAt: paymentResponse.payment?.createdAt || new Date().toISOString(),
        updatedAt: paymentResponse.payment?.updatedAt || new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`Error creating Square payment: ${error.message}`, error.stack);
      
      // Handle Square API specific errors
      if (error.body?.errors && Array.isArray(error.body.errors)) {
        const squareError = error.body.errors[0];
        const errorCode = squareError.code;
        const errorDetail = squareError.detail;
        
        this.logger.debug(`Square API error - Code: ${errorCode}, Detail: ${errorDetail}`);
        
        let userMessage = 'Payment failed. Please try again.';
        
        switch (errorCode) {
          case 'CARD_DECLINED':
            userMessage = 'Your card was declined. Please check your card details or try a different card.';
            break;
          case 'INVALID_CVV':
            userMessage = 'Invalid CVV. Please check your card\'s security code.';
            break;
          case 'INVALID_EXPIRATION':
            userMessage = 'Invalid expiration date. Please check your card\'s expiry date.';
            break;
          case 'INVALID_POSTAL_CODE':
            userMessage = 'Invalid postal code. Please check your billing address.';
            break;
          case 'VERIFY_AVS_FAILURE':
          case 'ADDRESS_VERIFICATION_FAILURE':
            userMessage = 'Address verification failed. Please check your billing address.';
            break;
          case 'VERIFY_CVV_FAILURE':
          case 'CVV_FAILURE':
            userMessage = 'CVV verification failed. Please check your card\'s security code.';
            break;
          case 'INSUFFICIENT_FUNDS':
            userMessage = 'Insufficient funds. Please try a different card or contact your bank.';
            break;
          case 'EXPIRED_CARD':
            userMessage = 'Your card has expired. Please use a different card.';
            break;
          case 'INVALID_ACCOUNT':
            userMessage = 'Invalid account. Please check your card details.';
            break;
          case 'GENERIC_DECLINE':
            userMessage = 'Your card was declined. Please try a different card.';
            break;
          case 'CARD_NOT_SUPPORTED':
            userMessage = 'This card type is not supported. Please use a different card.';
            break;
          case 'CARD_MALFUNCTION':
            userMessage = 'There was an issue with your card. Please try a different card.';
            break;
          case 'PICKUP_RISK':
            userMessage = 'Your card has been flagged for pickup. Please contact your bank.';
            break;
          case 'FRAUD_DECLINE':
            userMessage = 'Your card was declined due to suspected fraud. Please contact your bank.';
            break;
          case 'TEMPORARY_ERROR':
            userMessage = 'A temporary error occurred. Please try again in a few moments.';
            break;
          case 'RATE_LIMIT_EXCEEDED':
            userMessage = 'Too many payment attempts. Please wait a moment and try again.';
            break;
          default:
            this.logger.warn(`Unhandled Square error code: ${errorCode} - Detail: ${errorDetail}`);
            userMessage = `Payment failed: ${errorDetail || 'Unknown error'}`;
        }
        
        throw new InternalServerErrorException(userMessage);
      }
      
      throw error;
    }
  }

  /**
   * Create a payment for balance-based payments (no specific payment record)
   */
  async createBalancePayment(sourceId: string, amount: number, currency: string = 'GBP', note?: string): Promise<SquarePaymentResponseDto> {
    try {
      this.logger.debug(`Creating balance payment: £${amount} ${currency}`);

      // Extract token from sourceId object
      let token: string;
      if (typeof sourceId === 'string') {
        token = sourceId;
      } else if (sourceId && typeof sourceId === 'object' && 'token' in sourceId) {
        token = (sourceId as any).token;
      } else {
        throw new Error('Invalid sourceId format - expected string or object with token property');
      }

      // Create payment using the new Square SDK
      const paymentRequest = {
        sourceId: token,
        amountMoney: {
          amount: BigInt(Math.round(amount * 100)), // Convert to pence and use BigInt
          currency: currency.toUpperCase() as any,
        },
        idempotencyKey: `balance_pay_${Date.now()}`,
        note: note || `Balance payment`,
      };
      
      this.logger.debug(`Balance payment request: ${JSON.stringify(paymentRequest, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value, 2)}`);
      
      const paymentResponse = await this.getClient().payments.create(paymentRequest);

      this.logger.debug(`Balance payment created: ${paymentResponse.payment?.id}`);

      return {
        id: paymentResponse.payment?.id || 'unknown',
        status: paymentResponse.payment?.status || 'UNKNOWN',
        amountMoney: {
          amount: Number(paymentResponse.payment?.amountMoney?.amount || 0),
          currency: paymentResponse.payment?.amountMoney?.currency || currency.toUpperCase(),
        },
        receiptUrl: paymentResponse.payment?.receiptUrl || '',
        createdAt: paymentResponse.payment?.createdAt || new Date().toISOString(),
        updatedAt: paymentResponse.payment?.updatedAt || new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`Error creating Square payment: ${error.message}`, error.stack);
      
      // Handle Square API specific errors
      if (error.body?.errors && Array.isArray(error.body.errors)) {
        const squareError = error.body.errors[0];
        const errorCode = squareError.code;
        const errorDetail = squareError.detail;
        
        this.logger.debug(`Square API error - Code: ${errorCode}, Detail: ${errorDetail}`);
        
        let userMessage = 'Payment failed. Please try again.';
        
        switch (errorCode) {
          case 'CARD_DECLINED':
            userMessage = 'Your card was declined. Please check your card details or try a different card.';
            break;
          case 'INVALID_CVV':
            userMessage = 'Invalid CVV. Please check your card\'s security code.';
            break;
          case 'INVALID_EXPIRATION':
            userMessage = 'Invalid expiration date. Please check your card\'s expiry date.';
            break;
          case 'INVALID_POSTAL_CODE':
            userMessage = 'Invalid postal code. Please check your billing address.';
            break;
          case 'VERIFY_AVS_FAILURE':
          case 'ADDRESS_VERIFICATION_FAILURE':
            userMessage = 'Address verification failed. Please check your billing address.';
            break;
          case 'VERIFY_CVV_FAILURE':
          case 'CVV_FAILURE':
            userMessage = 'CVV verification failed. Please check your card\'s security code.';
            break;
          case 'INSUFFICIENT_FUNDS':
            userMessage = 'Insufficient funds. Please try a different card or contact your bank.';
            break;
          case 'EXPIRED_CARD':
            userMessage = 'Your card has expired. Please use a different card.';
            break;
          case 'INVALID_ACCOUNT':
            userMessage = 'Invalid account. Please check your card details.';
            break;
          case 'GENERIC_DECLINE':
            userMessage = 'Your card was declined. Please try a different card.';
            break;
          case 'CARD_NOT_SUPPORTED':
            userMessage = 'This card type is not supported. Please use a different card.';
            break;
          case 'CARD_MALFUNCTION':
            userMessage = 'There was an issue with your card. Please try a different card.';
            break;
          case 'PICKUP_RISK':
            userMessage = 'Your card has been flagged for pickup. Please contact your bank.';
            break;
          case 'FRAUD_DECLINE':
            userMessage = 'Your card was declined due to suspected fraud. Please contact your bank.';
            break;
          case 'TEMPORARY_ERROR':
            userMessage = 'A temporary error occurred. Please try again in a few moments.';
            break;
          case 'RATE_LIMIT_EXCEEDED':
            userMessage = 'Too many payment attempts. Please wait a moment and try again.';
            break;
          default:
            this.logger.warn(`Unhandled Square error code: ${errorCode} - Detail: ${errorDetail}`);
            userMessage = `Payment failed: ${errorDetail || 'Unknown error'}`;
        }
        
        throw new InternalServerErrorException(userMessage);
      }
      
      throw new InternalServerErrorException('Failed to create payment');
    }
  }

  async getPayment(paymentId: string): Promise<SquarePaymentResponseDto> {
    try {
      const paymentResponse = await this.getClient().payments.get({
        paymentId: paymentId,
      });

      if (!paymentResponse.payment) {
        throw new BadRequestException(`Payment with ID ${paymentId} not found`);
      }

      const payment = paymentResponse.payment;
      return {
        id: payment.id || 'unknown',
        status: payment.status || 'UNKNOWN',
        amountMoney: {
          amount: Number(payment.amountMoney?.amount || 0),
          currency: payment.amountMoney?.currency || 'GBP',
        },
        receiptUrl: payment.receiptUrl || '',
        createdAt: payment.createdAt || new Date().toISOString(),
        updatedAt: payment.updatedAt || new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error getting Square payment: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to get payment');
    }
  }

  async testConnectivity(): Promise<{ status: string; message: string; config: any }> {
    try {
      this.logger.log('Testing Square API connectivity using new SDK');
      
      const locationsResponse = await this.getClient().locations.list();
      
      this.logger.log(`Square API connectivity test successful. Found ${locationsResponse.locations?.length || 0} locations.`);
      
      return {
        status: 'success',
        message: `Square API connectivity test successful. Found ${locationsResponse.locations?.length || 0} locations.`,
        config: {
          environment: 'https://connect.squareupsandbox.com',
          locationId: squareConfig.locationId,
          applicationId: squareConfig.applicationId,
          hasAccessToken: !!squareConfig.accessToken,
          hasWebhookKey: !!squareConfig.webhookSignatureKey,
          locationsFound: locationsResponse.locations?.length || 0,
        },
      };
    } catch (error) {
      this.logger.error(`Error testing Square API connectivity: ${error.message}`);
      return {
        status: 'error',
        message: `Error testing Square API connectivity: ${error.message}`,
        config: {
          environment: 'https://connect.squareupsandbox.com',
          locationId: squareConfig.locationId,
          applicationId: squareConfig.applicationId,
          hasAccessToken: !!squareConfig.accessToken,
          hasWebhookKey: !!squareConfig.webhookSignatureKey,
        },
      };
    }
  }
}
