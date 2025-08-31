import { Module } from '@nestjs/common';
import { PaymentConfigService } from './payment-config.service';
import { PaymentConfigController } from './payment-config.controller';
import { PaymentRecordService } from './payment-record.service';
import { PaymentRecordController } from './payment-record.controller';
import { UserBalanceService } from './user-balance.service';
import { UserBalanceController } from './user-balance.controller';
import { DiscountEligibilityService } from './discount-eligibility.service';
import { DiscountEligibilityController } from './discount-eligibility.controller';
import { SquareService } from './square.service';
import { SquareController } from './square.controller';
import { BalancePaymentService } from './balance-payment.service';
import { BalancePaymentController } from './balance-payment.controller';
import { YearlySubsController } from './yearly-subs.controller';
import { FeeIntegrationService } from './fee-integration.service';
import { FinancialOverviewService } from './financial-overview.service';
import { FinancialOverviewController } from './financial-overview.controller';
import { PrismaService } from '../../prisma.service';
import { ScrapingModule } from '../scraping/scraping.module';

@Module({
  imports: [ScrapingModule],
  controllers: [
    PaymentConfigController,
    PaymentRecordController,
    UserBalanceController,
    DiscountEligibilityController,
    SquareController,
    BalancePaymentController,
    YearlySubsController,
    FinancialOverviewController,
  ],
  providers: [
    PaymentConfigService,
    PaymentRecordService,
    UserBalanceService,
    DiscountEligibilityService,
    SquareService,
    BalancePaymentService,
    FeeIntegrationService,
    FinancialOverviewService,
    PrismaService,
  ],
  exports: [
    PaymentConfigService,
    PaymentRecordService,
    UserBalanceService,
    DiscountEligibilityService,
    SquareService,
    BalancePaymentService,
    FeeIntegrationService,
    FinancialOverviewService,
  ],
})
export class FinancialModule {}
