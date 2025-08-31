import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { BalancePaymentService } from './balance-payment.service';
import { CreateBalancePaymentDto } from './dto/balance-payment.dto';

@Controller('balance-payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BalancePaymentController {
  constructor(private readonly balancePaymentService: BalancePaymentService) {}

  /**
   * Get user's balance summary and due payments
   */
  @Get('summary/:userId')
  @Roles('ADMIN', 'MANAGER', 'PLAYER')
  async getBalanceSummary(@Param('userId') userId: string, @Request() req: any) {
    const userIdNum = parseInt(userId);

    // Players can only see their own balance
    if (req.user.role === 'PLAYER' && req.user.sub !== userIdNum) {
      throw new Error('Access denied: You can only view your own balance');
    }

    return this.balancePaymentService.getUserBalanceSummary(userIdNum);
  }

  /**
   * Process a balance-based payment
   */
  @Post('process/:userId')
  @Roles('ADMIN', 'MANAGER', 'PLAYER')
  async processBalancePayment(
    @Param('userId') userId: string,
    @Body() createBalancePaymentDto: CreateBalancePaymentDto,
    @Request() req: any,
  ) {
    const userIdNum = parseInt(userId);

    // Players can only pay their own balance
    if (req.user.role === 'PLAYER' && req.user.sub !== userIdNum) {
      throw new Error('Access denied: You can only pay your own balance');
    }

    return this.balancePaymentService.processBalancePayment(userIdNum, createBalancePaymentDto);
  }
}
