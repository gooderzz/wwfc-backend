import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { FeeIntegrationService } from '../financial/fee-integration.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ScheduledJobsService {
  private readonly logger = new Logger(ScheduledJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly feeIntegrationService: FeeIntegrationService,
  ) {}

  /**
   * Run daily at 2 AM to create social event fees
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runDailySocialEventFeeCreation() {
    this.logger.log('Starting daily social event fee creation job');
    
    try {
      const lastRun = await this.getLastRunTime();
      const now = new Date();
      
      this.logger.log(`Last run: ${lastRun}, Current time: ${now}`);
      
      // Process future events (next 24 hours)
      await this.processFutureSocialEvents();
      
      // Process past events (24 hours ago)
      await this.processPastSocialEvents();
      
      // Update last run time
      await this.updateLastRunTime(now);
      
      this.logger.log('Daily social event fee creation job completed successfully');
    } catch (error) {
      this.logger.error('Error in daily social event fee creation job:', error);
    }
  }

  /**
   * Process social events in the next 24 hours that need fees created
   */
  private async processFutureSocialEvents() {
    this.logger.log('Processing future social events for fee creation');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const events = await this.prisma.event.findMany({
      where: {
        eventType: 'SOCIAL',
        startDateTime: {
          gte: new Date(),
          lte: tomorrow
        },
        cost: {
          not: null
        },
        isActive: true
      }
    });

    this.logger.log(`Found ${events.length} social events in next 24 hours with fees`);

    for (const event of events) {
      try {
        await this.feeIntegrationService.createSocialEventFees(event.id);
      } catch (error) {
        this.logger.error(`Failed to create fees for event ${event.id}:`, error);
      }
    }
  }

  /**
   * Process social events from 24 hours ago to catch late RSVPs
   */
  private async processPastSocialEvents() {
    this.logger.log('Processing past social events for late RSVP fees');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const events = await this.prisma.event.findMany({
      where: {
        eventType: 'SOCIAL',
        startDateTime: {
          gte: yesterday,
          lte: new Date()
        },
        cost: {
          not: null
        },
        isActive: true
      }
    });

    this.logger.log(`Found ${events.length} social events from 24 hours ago with fees`);

    for (const event of events) {
      try {
        await this.feeIntegrationService.createSocialEventFees(event.id);
      } catch (error) {
        this.logger.error(`Failed to create late RSVP fees for event ${event.id}:`, error);
      }
    }
  }

  /**
   * Get the last time the job ran
   */
  private async getLastRunTime(): Promise<Date> {
    const lastRunRecord = await this.prisma.scheduledJobRun.findFirst({
      where: { jobName: 'social_event_fee_creation' },
      orderBy: { lastRun: 'desc' }
    });

    return lastRunRecord?.lastRun || new Date(0); // Return epoch if no record
  }

  /**
   * Update the last run time
   */
  private async updateLastRunTime(runTime: Date) {
    await this.prisma.scheduledJobRun.upsert({
      where: { jobName: 'social_event_fee_creation' },
      update: { lastRun: runTime },
      create: {
        jobName: 'social_event_fee_creation',
        lastRun: runTime
      }
    });
  }

  /**
   * Manual trigger for testing or recovery
   */
  async manualTriggerSocialEventFeeCreation() {
    this.logger.log('Manual trigger of social event fee creation');
    await this.runDailySocialEventFeeCreation();
  }
}
