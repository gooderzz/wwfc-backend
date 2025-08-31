import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from '../../prisma.service';
import { ScheduledJobsService } from './scheduled-jobs.service';
import { FinancialModule } from '../financial/financial.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    FinancialModule
  ],
  providers: [
    ScheduledJobsService,
    PrismaService
  ],
  exports: [ScheduledJobsService]
})
export class ScheduledJobsModule {}
