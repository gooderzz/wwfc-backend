import { Module } from '@nestjs/common';
import { FixturesController } from './fixtures.controller';
import { FixturesService } from './fixtures.service';
import { PrismaService } from '../../prisma.service';
import { EventsModule } from '../events/events.module';
import { FinancialModule } from '../financial/financial.module';

@Module({
  imports: [EventsModule, FinancialModule],
  controllers: [FixturesController],
  providers: [FixturesService, PrismaService],
  exports: [FixturesService],
})
export class FixturesModule {}
