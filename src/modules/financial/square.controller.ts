import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  Headers, 
  Req, 
  Res, 
  UseGuards,
  Logger,
  UnauthorizedException,
  BadRequestException
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SquareService } from './square.service';
import { CreateSquarePaymentDto } from './dto/square-payment.dto';
import { squareConfig } from '../../config/square.config';

@Controller('payments/square')
export class SquareController {
  private readonly logger = new Logger(SquareController.name);

  constructor(private readonly squareService: SquareService) {}

  /**
   * Create a payment via Square API
   */
  @Post('create-payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER', 'PLAYER')
  async createPayment(@Body() createPaymentDto: CreateSquarePaymentDto) {
    try {
      const result = await this.squareService.createPayment(createPaymentDto);
      return {
        success: true,
        data: result,
        message: 'Payment created successfully',
      };
    } catch (error) {
      this.logger.error(`Error creating payment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get payment status from Square API
   */
  @Get('payment/:paymentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async getPayment(@Param('paymentId') paymentId: string) {
    this.logger.log(`Retrieving Square payment ${paymentId}`);
    
    try {
      const result = await this.squareService.getPayment(paymentId);
      return {
        success: true,
        data: result,
        message: 'Payment retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Error retrieving payment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Square webhook handler (placeholder for future implementation)
   */
  @Post('webhook')
  async handleWebhook(
    @Headers('x-square-signature') signature: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.logger.log('Received Square webhook (placeholder implementation)');

    try {
      // TODO: Implement webhook signature verification and event processing
      // For now, just log the webhook and return success
      this.logger.log('Webhook body:', JSON.stringify(req.body, null, 2));
      
      // Return 200 OK to Square
      res.status(200).send('OK');
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      
      // Still return 200 to Square to prevent retries
      res.status(200).send('OK');
    }
  }

  /**
   * Test Square API connectivity
   */
  @Get('test-connectivity')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async testConnectivity() {
    this.logger.log('Testing Square API connectivity');
    
    try {
      const result = await this.squareService.testConnectivity();
      
      return {
        success: result.status === 'success',
        message: result.message,
        config: result.config,
      };
    } catch (error) {
      this.logger.error(`Connectivity test failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Test Square payment creation (for debugging)
   */
  @Post('test-payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async testPayment(@Body() testData: { token: string; amount: number }) {
    this.logger.log('Testing Square payment creation');
    
    try {
      // Use the exact same code as our working test script
      const { SquareClient } = require('square');
      
      const client = new SquareClient({ 
        token: squareConfig.accessToken,
        environment: squareConfig.environment === 'production' 
          ? 'https://connect.squareup.com' 
          : 'https://connect.squareupsandbox.com'
      });
      
      const paymentResponse = await client.payments.create({
        sourceId: testData.token,
        amountMoney: {
          amount: BigInt(Math.round(testData.amount * 100)),
          currency: 'GBP'
        },
        idempotencyKey: `test_${Date.now()}`,
        note: 'Test payment from controller'
      });
      
      return {
        success: true,
        paymentId: paymentResponse.payment?.id,
        status: paymentResponse.payment?.status,
        message: 'Test payment successful'
      };
    } catch (error) {
      this.logger.error(`Test payment failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        body: error.body
      };
    }
  }

  /**
   * Get Square configuration info (for frontend)
   */
  @Get('config')
  @UseGuards(JwtAuthGuard)
  async getConfig() {
    return {
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
      currency: 'GBP',
      supportedPaymentMethods: ['card'],
    };
  }
}
