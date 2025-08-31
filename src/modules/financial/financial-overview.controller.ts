import { Controller, Get, UseGuards } from '@nestjs/common';
import { FinancialOverviewService } from './financial-overview.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('financial/overview')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class FinancialOverviewController {
  constructor(private readonly financialOverviewService: FinancialOverviewService) {}

  /**
   * Get complete financial overview
   */
  @Get()
  async getFinancialOverview() {
    return this.financialOverviewService.getFinancialOverview();
  }

  /**
   * Get team debt analysis
   */
  @Get('teams')
  async getTeamDebts() {
    return this.financialOverviewService.getTeamDebts();
  }

  /**
   * Get player debt analysis
   */
  @Get('players')
  async getPlayerDebts() {
    return this.financialOverviewService.getPlayerDebts();
  }
}
