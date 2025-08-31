import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { UserBalanceService } from './user-balance.service';
import { AdjustBalanceDto } from './dto/user-balance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserBalanceController {
  constructor(private readonly userBalanceService: UserBalanceService) {}

  @Get(':id/balance')
  @Roles('ADMIN', 'MANAGER', 'PLAYER')
  async getUserBalance(@Param('id') id: string, @Request() req?: any) {
    const userId = parseInt(id);

    // Players can only see their own balance
    if (req.user.role === 'PLAYER' && req.user.sub !== userId) {
      throw new Error('Access denied: You can only view your own balance');
    }

    // Managers can only see their team's balances
    if (req.user.role === 'MANAGER') {
      // This will be handled in the service by filtering by team
      // For now, we'll allow managers to view any user's balance
      // TODO: Add team-based filtering
    }

    return this.userBalanceService.getUserBalance(userId);
  }

  @Get(':id/payment-history')
  @Roles('ADMIN', 'MANAGER', 'PLAYER')
  async getPaymentHistory(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    const userId = parseInt(id);

    // Players can only see their own payment history
    if (req.user.role === 'PLAYER' && req.user.sub !== userId) {
      throw new Error('Access denied: You can only view your own payment history');
    }

    return this.userBalanceService.getPaymentHistory(userId, limit ? parseInt(limit) : undefined);
  }

  @Post(':id/balance/adjust')
  @Roles('ADMIN', 'MANAGER')
  async adjustBalance(
    @Param('id') id: string,
    @Body() adjustBalanceDto: AdjustBalanceDto,
    @Request() req?: any,
  ) {
    const userId = parseInt(id);

    // Managers can only adjust their team's balances
    if (req.user.role === 'MANAGER') {
      // TODO: Add team-based validation
      // For now, we'll allow managers to adjust any user's balance
    }

    return this.userBalanceService.adjustBalance(userId, adjustBalanceDto);
  }

  @Get('team/:teamId/balances')
  @Roles('ADMIN', 'MANAGER')
  async getTeamBalances(@Param('teamId') teamId: string, @Request() req?: any) {
    const teamIdNum = parseInt(teamId);

    // Managers can only see their own team's balances
    if (req.user.role === 'MANAGER' && req.user.teamId !== teamIdNum) {
      throw new Error('Access denied: You can only view your own team\'s balances');
    }

    return this.userBalanceService.getTeamBalances(teamIdNum);
  }

  @Get('overdue-balances')
  @Roles('ADMIN', 'MANAGER')
  async getOverdueBalances(@Query('teamId') teamId?: string, @Request() req?: any) {
    let teamIdNum: number | undefined;

    if (teamId) {
      teamIdNum = parseInt(teamId);
    }

    // Managers can only see their own team's overdue balances
    if (req.user.role === 'MANAGER') {
      teamIdNum = req.user.teamId;
    }

    return this.userBalanceService.getOverdueBalances(teamIdNum);
  }

  @Post(':id/balance/calculate')
  @Roles('ADMIN')
  async calculateBalance(@Param('id') id: string) {
    const userId = parseInt(id);
    return this.userBalanceService.calculateBalance(userId);
  }
}
