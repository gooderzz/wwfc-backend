import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { TrainingCostsService } from './training-costs.service';
import { TrainingCostsController } from './training-costs.controller';
import { RecurringEventsService } from './recurring-events.service';
import { EventTypesService } from './event-types.service';
import { PrismaService } from '../../prisma.service';
import { FinancialModule } from '../financial/financial.module';

@Module({
  imports: [FinancialModule],
  controllers: [EventsController, TrainingCostsController],
  providers: [EventsService, TrainingCostsService, RecurringEventsService, EventTypesService, PrismaService],
  exports: [EventsService, TrainingCostsService, RecurringEventsService, EventTypesService],
})
export class EventsModule {}
