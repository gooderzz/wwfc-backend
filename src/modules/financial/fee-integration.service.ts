import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PaymentRecordService } from './payment-record.service';
import { PaymentConfigService } from './payment-config.service';
import { DiscountEligibilityService } from './discount-eligibility.service';
import { UserBalanceService } from './user-balance.service';
import { PaymentType, PaymentStatus, PaymentMethod } from '@prisma/client';

@Injectable()
export class FeeIntegrationService {
  private readonly logger = new Logger(FeeIntegrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentRecordService: PaymentRecordService,
    private readonly paymentConfigService: PaymentConfigService,
    private readonly discountEligibilityService: DiscountEligibilityService,
    private readonly userBalanceService: UserBalanceService,
  ) {}

  // ===== MATCH FEE METHODS =====

  /**
   * Create match fees for all selected players in a team selection
   */
  async createMatchFeesForTeamSelection(fixtureId: number, teamSelection: {
    starting11: {
      gk: number | null;
      lb: number | null;
      cb1: number | null;
      cb2: number | null;
      rb: number | null;
      dm: number | null;
      cm: number | null;
      am: number | null;
      lw: number | null;
      st: number | null;
      rw: number | null;
    };
    substitutes: number[];
  }): Promise<void> {
    try {
      // Get fixture details
      const fixture = await this.prisma.fixture.findUnique({
        where: { id: fixtureId }
      });

      if (!fixture) {
        throw new NotFoundException(`Fixture ${fixtureId} not found`);
      }

      // Get match fee configuration
      const matchFeeConfig = await this.paymentConfigService.getCurrentConfig('MATCH_FEE');
      
      // Get all selected player IDs
      const starting11Ids = Object.values(teamSelection.starting11).filter(id => id !== null) as number[];
      const substituteIds = teamSelection.substitutes;
      const allPlayerIds = [...starting11Ids, ...substituteIds];

      this.logger.log(`Creating match fees for fixture ${fixtureId}: ${allPlayerIds.length} players selected`);

      // Create fees for all selected players
      for (const playerId of allPlayerIds) {
        const selectionType = starting11Ids.includes(playerId) ? 'STARTING' : 'SUBSTITUTE';
        
        await this.createMatchFeeForPlayer(
          playerId,
          fixtureId,
          matchFeeConfig.amount,
          fixture.kickOffTime,
          selectionType,
          fixture.opponent
        );
      }
    } catch (error) {
      this.logger.error(`Failed to create match fees for fixture ${fixtureId}:`, error);
      throw error;
    }
  }

  /**
   * Apply match minutes discounts based on substitution events
   * This should be called after match events are saved
   */
  async applyMatchMinutesDiscountsFromEvents(fixtureId: number): Promise<void> {
    try {
      // Get all match events for this fixture
      const matchEvents = await this.prisma.matchEvent.findMany({
        where: { fixtureId },
        orderBy: { minute: 'asc' }
      });

      // Get all match fee payment records for this fixture
      const matchFees = await this.prisma.paymentRecord.findMany({
        where: {
          fixtureId: fixtureId,
          paymentType: 'MATCH_FEE'
        }
      });

      // Calculate minutes played for each player
      const playerMinutes = new Map<number, number>();

      this.logger.log(`Processing ${matchFees.length} match fees for fixture ${fixtureId}`);
      this.logger.log(`Found ${matchEvents.length} match events`);
      
      // Log all match events for debugging
      for (const event of matchEvents) {
        this.logger.log(`Match event: ${event.eventType} - Player: ${event.playerId} - Minute: ${event.minute} - SubstitutedFor: ${event.substitutedForId}`);
      }

      // Log all substitution events specifically
      const substitutionEvents = matchEvents.filter(event => event.eventType === 'SUBSTITUTION');
      this.logger.log(`Found ${substitutionEvents.length} substitution events:`);
      for (const subEvent of substitutionEvents) {
        this.logger.log(`  Substitution: Player ${subEvent.playerId} substituted for ${subEvent.substitutedForId} at minute ${subEvent.minute}`);
      }

      for (const fee of matchFees) {
        const playerId = fee.userId;
        let minutesPlayed = 90; // Default: full game for starters

        this.logger.log(`\n=== PROCESSING FEE FOR PLAYER ${playerId} ===`);
        this.logger.log(`Fee ID: ${fee.id}, Amount: ${fee.amount}, Current Discount: ${fee.discountAmount}`);

        // Check if player was substituted off
        const substitutionOff = matchEvents.find(event => 
          event.eventType === 'SUBSTITUTION' && 
          event.playerId === playerId
        );

        // Check if player was substituted on
        const substitutionOn = matchEvents.find(event => 
          event.eventType === 'SUBSTITUTION' && 
          event.substitutedForId === playerId
        );

        this.logger.log(`Player ${playerId} - Substitution off found:`, !!substitutionOff);
        if (substitutionOff) {
          this.logger.log(`  Substitution off details: Player ${substitutionOff.playerId} substituted for ${substitutionOff.substitutedForId} at minute ${substitutionOff.minute}`);
        }
        this.logger.log(`Player ${playerId} - Substitution on found:`, !!substitutionOn);
        if (substitutionOn) {
          this.logger.log(`  Substitution on details: Player ${substitutionOn.playerId} substituted for ${substitutionOn.substitutedForId} at minute ${substitutionOn.minute}`);
        }

        if (substitutionOff) {
          // Player was substituted off
          minutesPlayed = substitutionOff.minute;
          this.logger.log(`Player ${playerId} substituted off at minute ${substitutionOff.minute} - played ${minutesPlayed} minutes`);
        } else if (substitutionOn) {
          // Player was substituted on
          minutesPlayed = 90 - substitutionOn.minute;
          this.logger.log(`Player ${playerId} substituted on at minute ${substitutionOn.minute} - played ${minutesPlayed} minutes`);
        } else {
          this.logger.log(`Player ${playerId} played full game - ${minutesPlayed} minutes`);
        }

        // Apply discount if less than 60 minutes
        if (minutesPlayed < 60) {
          this.logger.log(`Applying 50% discount to player ${playerId} - played ${minutesPlayed} minutes`);
          this.logger.log(`Calling applyMatchMinutesDiscount with: playerId=${playerId}, feeId=${fee.id}, minutesPlayed=${minutesPlayed}`);
          await this.applyMatchMinutesDiscount(playerId, fee.id, minutesPlayed);
          this.logger.log(`Discount applied successfully for player ${playerId}`);
        } else {
          this.logger.log(`No discount for player ${playerId} - played ${minutesPlayed} minutes`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to apply match minutes discounts for fixture ${fixtureId}:`, error);
      throw error;
    }
  }

  /**
   * Create match fee for a specific player
   */
  private async createMatchFeeForPlayer(
    playerId: number,
    fixtureId: number,
    amount: any,
    dueDate: Date,
    selectionType: string,
    opponent: string
  ): Promise<void> {
                  await this.createPaymentRecord({
          userId: playerId,
          paymentType: 'MATCH_FEE',
          amount: amount.toString(),
          dueDate: dueDate.toISOString(),
          fixtureId: fixtureId,
          selectionType,
          notes: `Match fee vs ${opponent} (${selectionType})`
        });
  }

  /**
   * Update match fees when actual team selection changes
   * Note: This method is for updating fees when the actual team selection is modified
   */
  async updateMatchFeesForTeamSelection(fixtureId: number, newSelection: {
    starting11: any;
    substitutes: number[];
  }): Promise<void> {
    try {
      // Delete existing match fees for this fixture
      await this.prisma.paymentRecord.deleteMany({
        where: {
          paymentType: 'MATCH_FEE',
          notes: {
            contains: `Match fee vs`
          }
        }
      });

      // Create new match fees
      await this.createMatchFeesForTeamSelection(fixtureId, newSelection);
    } catch (error) {
      this.logger.error(`Failed to update match fees for fixture ${fixtureId}:`, error);
      throw error;
    }
  }

  /**
   * Apply match minutes discount for players who played less than 60 minutes
   */
  async applyMatchMinutesDiscount(userId: number, paymentRecordId: string, minutesPlayed: number): Promise<void> {
    this.logger.log(`\n=== APPLYING MATCH MINUTES DISCOUNT ===`);
    this.logger.log(`User ID: ${userId}, Payment Record ID: ${paymentRecordId}, Minutes Played: ${minutesPlayed}`);
    
    if (minutesPlayed >= 60) {
      this.logger.log(`No discount needed - played ${minutesPlayed} minutes (>= 60)`);
      return; // No discount needed
    }

    const paymentRecord = await this.prisma.paymentRecord.findUnique({
      where: { id: paymentRecordId }
    });

    if (!paymentRecord || paymentRecord.paymentType !== 'MATCH_FEE') {
      this.logger.error(`Payment record not found or not a match fee: ${paymentRecordId}`);
      throw new NotFoundException('Match fee payment record not found');
    }

    this.logger.log(`Found payment record: Amount=${paymentRecord.amount}, Current Discount=${paymentRecord.discountAmount}`);

    // Apply 50% discount
    const discountAmount = parseFloat(paymentRecord.amount.toString()) * 0.5;
    const finalAmount = parseFloat(paymentRecord.amount.toString()) - discountAmount;

    this.logger.log(`Calculated discount: ${discountAmount}, Final amount: ${finalAmount}`);

    await this.prisma.paymentRecord.update({
      where: { id: paymentRecordId },
      data: {
        discountAmount: discountAmount.toString(),
        finalAmount: finalAmount.toString(),
        notes: `${paymentRecord.notes} (50% discount - played ${minutesPlayed} minutes)`
      }
    });

    this.logger.log(`Successfully updated payment record ${paymentRecordId} with discount`);
  }

  // ===== TRAINING FEE METHODS =====

  /**
   * Create training fee for a user when attendance is marked
   */
  async createTrainingFeeForUser(userId: number, eventId: string, dueDate: Date): Promise<void> {
    try {
      // Check if fee already exists
      const existingFee = await this.prisma.paymentRecord.findFirst({
        where: {
          userId,
          eventId,
          paymentType: 'TRAINING_FEE'
        }
      });

      if (existingFee) {
        this.logger.log(`Training fee already exists for user ${userId} and event ${eventId}`);
        return; // Fee already exists, don't create duplicate
      }

      // Get training fee configuration
      const trainingFeeConfig = await this.paymentConfigService.getCurrentConfig('TRAINING_FEE');
      
      // Get event details for better description
      const event = await this.prisma.event.findUnique({
        where: { id: eventId }
      });

      await this.createPaymentRecord({
        userId,
        paymentType: 'TRAINING_FEE',
        amount: trainingFeeConfig.amount.toString(),
        dueDate: dueDate.toISOString(),
        eventId,
        notes: `Training session fee${event ? ` - ${event.title}` : ''}`
      });

      this.logger.log(`Created training fee for user ${userId} and event ${eventId}`);
    } catch (error) {
      this.logger.error(`Failed to create training fee for user ${userId} and event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Check if training fee already exists for a user and event
   */
  async checkTrainingFeeExists(userId: number, eventId: string): Promise<boolean> {
    const existingFee = await this.prisma.paymentRecord.findFirst({
      where: {
        userId,
        eventId,
        paymentType: 'TRAINING_FEE'
      }
    });

    return !!existingFee;
  }

  // ===== SOCIAL EVENT FEE METHODS =====

  /**
   * Process social event fees 24 hours before events
   */
  async processSocialEventFees(): Promise<void> {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      // Find social events happening tomorrow with costs
      const socialEvents = await this.prisma.event.findMany({
        where: {
          eventType: 'SOCIAL',
          startDateTime: {
            gte: tomorrow,
            lt: dayAfterTomorrow
          },
          cost: { gt: 0 }
        },
        include: {
          rsvps: {
            where: { status: 'YES' }
          }
        }
      });

      this.logger.log(`Processing social event fees for ${socialEvents.length} events`);

      for (const event of socialEvents) {
        for (const rsvp of event.rsvps) {
          await this.createSocialEventFeeForUser(
            rsvp.userId,
            event.id,
            event.cost ? parseFloat(event.cost.toString()) : 0,
            event.startDateTime
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to process social event fees:', error);
      throw error;
    }
  }

  /**
   * Create social event fee for a specific user
   */
  async createSocialEventFeeForUser(userId: number, eventId: string, cost: number, dueDate: Date): Promise<void> {
    try {
      // Check if fee already exists
      const existingFee = await this.prisma.paymentRecord.findFirst({
        where: {
          userId,
          eventId,
          paymentType: 'SOCIAL_EVENT'
        }
      });

      if (existingFee) {
        this.logger.log(`Social event fee already exists for user ${userId} and event ${eventId}`);
        return;
      }

      // Get event details for better description
      const event = await this.prisma.event.findUnique({
        where: { id: eventId }
      });

      await this.createPaymentRecord({
        userId,
        paymentType: 'SOCIAL_EVENT',
        amount: cost.toString(),
        dueDate: dueDate.toISOString(),
        eventId,
        notes: `Social event fee${event ? ` - ${event.title}` : ''}`
      });

      this.logger.log(`Created social event fee for user ${userId} and event ${eventId}`);
    } catch (error) {
      this.logger.error(`Failed to create social event fee for user ${userId} and event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Create social event fees for all users who RSVP'd YES to an event
   */
  async createSocialEventFees(eventId: string): Promise<void> {
    try {
      // Get event details
      const event = await this.prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        throw new NotFoundException(`Event ${eventId} not found`);
      }

      if (!event.cost) {
        this.logger.log(`Event ${eventId} has no cost, skipping fee creation`);
        return;
      }

      if (event.eventType !== 'SOCIAL') {
        this.logger.log(`Event ${eventId} is not a social event, skipping fee creation`);
        return;
      }

      // Get all users who RSVP'd YES to this event
      const rsvps = await this.prisma.eventRSVP.findMany({
        where: {
          eventId,
          status: 'YES'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      this.logger.log(`Creating social event fees for event ${eventId}: ${rsvps.length} users RSVP'd YES`);

      const cost = parseFloat(event.cost.toString());
      const dueDate = new Date(event.startDateTime);

      // Create fees for each user who RSVP'd YES
      for (const rsvp of rsvps) {
        try {
          await this.createSocialEventFeeForUser(rsvp.userId, eventId, cost, dueDate);
        } catch (error) {
          this.logger.error(`Failed to create fee for user ${rsvp.userId} and event ${eventId}:`, error);
          // Continue with other users even if one fails
        }
      }

      this.logger.log(`Successfully processed social event fees for event ${eventId}`);
    } catch (error) {
      this.logger.error(`Failed to create social event fees for event ${eventId}:`, error);
      throw error;
    }
  }

  /**
   * Handle social event cancellation - delete unpaid fees and credit paid fees
   */
  async handleSocialEventCancellation(eventId: string): Promise<void> {
    try {
      // Get all payment records for this event
      const paymentRecords = await this.prisma.paymentRecord.findMany({
        where: {
          eventId,
          paymentType: 'SOCIAL_EVENT'
        }
      });

      this.logger.log(`Handling cancellation for event ${eventId}: ${paymentRecords.length} payment records found`);

      for (const paymentRecord of paymentRecords) {
        if (paymentRecord.status === 'PAID') {
          // Credit the user's balance
          const paidAmount = parseFloat(paymentRecord.paidAmount.toString());
          await this.userBalanceService.adjustBalance(paymentRecord.userId, {
            amount: paidAmount.toString(),
            reason: `Social event cancellation refund - ${eventId}`
          });
          this.logger.log(`Credited user ${paymentRecord.userId} balance by ${paidAmount} for cancelled event`);
        }

        // Delete the payment record
        await this.prisma.paymentRecord.delete({
          where: { id: paymentRecord.id }
        });
      }

      this.logger.log(`Successfully handled cancellation for event ${eventId}`);
    } catch (error) {
      this.logger.error(`Failed to handle cancellation for event ${eventId}:`, error);
      throw error;
    }
  }

  // ===== CARD FEE METHODS =====

  /**
   * Create card fee when match event is created
   */
  async createCardFee(userId: number, matchEventId: string, cardType: 'YELLOW' | 'RED', fixtureId: number): Promise<void> {
    try {
      const paymentType = cardType === 'YELLOW' ? 'YELLOW_CARD_FEE' : 'RED_CARD_FEE';
      const cardFeeConfig = await this.paymentConfigService.getCurrentConfig(paymentType);

      // Get fixture details for better description
      const fixture = await this.prisma.fixture.findUnique({
        where: { id: fixtureId }
      });

      await this.createPaymentRecord({
        userId,
        paymentType,
        amount: cardFeeConfig.amount.toString(),
        dueDate: new Date().toISOString(),
        matchEventId,
        notes: `${cardType} card fee${fixture ? ` - ${fixture.opponent}` : ''}`
      });

      this.logger.log(`Created ${cardType.toLowerCase()} card fee for user ${userId} and match event ${matchEventId}`);
    } catch (error) {
      this.logger.error(`Failed to create ${cardType.toLowerCase()} card fee for user ${userId} and match event ${matchEventId}:`, error);
      throw error;
    }
  }

  /**
   * Handle card fee deletion when match event is deleted
   */
  async handleCardFeeDeletion(matchEventId: string, userId: number): Promise<void> {
    try {
      const paymentRecord = await this.prisma.paymentRecord.findFirst({
        where: { matchEventId }
      });

      if (!paymentRecord) {
        this.logger.log(`No payment record found for match event ${matchEventId}`);
        return;
      }

      if (paymentRecord.status === 'PAID') {
        // Credit the user's balance
        const paidAmount = parseFloat(paymentRecord.paidAmount.toString());
        await this.userBalanceService.adjustBalance(userId, {
          amount: paidAmount.toString(),
          reason: `Card fee refund for deleted match event: ${matchEventId}`
        });
        this.logger.log(`Credited user ${userId} balance by ${paidAmount} for deleted card fee`);
      }

      // Delete the payment record
      await this.prisma.paymentRecord.delete({
        where: { id: paymentRecord.id }
      });

      this.logger.log(`Deleted card fee payment record ${paymentRecord.id} for match event ${matchEventId}`);
    } catch (error) {
      this.logger.error(`Failed to handle card fee deletion for match event ${matchEventId}:`, error);
      throw error;
    }
  }

  // ===== YEARLY SUBSCRIPTION METHODS =====

  /**
   * Create yearly subscriptions for selected players
   */
  async createYearlySubscriptions(playerIds: number[], season: string, amount: number): Promise<void> {
    try {
      this.logger.log(`Creating yearly subscriptions for ${playerIds.length} players for season ${season}`);

      for (const playerId of playerIds) {
        await this.createPaymentRecord({
          userId: playerId,
          paymentType: 'YEARLY_SUBS',
          amount: amount.toString(),
          dueDate: new Date().toISOString(),
          notes: `Yearly subscription fee - ${season}`
        });
      }

      this.logger.log(`Successfully created yearly subscriptions for ${playerIds.length} players`);
    } catch (error) {
      this.logger.error(`Failed to create yearly subscriptions for ${playerIds.length} players:`, error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Calculate discount for a user based on their eligibility
   */
  private async calculateDiscount(userId: number, amount: number): Promise<{ discountAmount: number; finalAmount: number }> {
    const discountEligibility = await this.discountEligibilityService.findByUser(userId);
    
    let discountAmount = 0;
    let finalAmount = amount;

    // Apply 50% discount for unemployed or students
    if (discountEligibility.some(d => d.isActive && (d.discountType === 'UNEMPLOYED' || d.discountType === 'STUDENT'))) {
      discountAmount = amount * 0.5;
      finalAmount = amount - discountAmount;
    }

    return { discountAmount, finalAmount };
  }

  /**
   * Create a payment record with automatic discount calculation and credit allocation
   */
  private async createPaymentRecord(data: {
    userId: number;
    paymentType: PaymentType;
    amount: string;
    dueDate: string;
    eventId?: string;
    fixtureId?: number;
    matchEventId?: string;
    selectionType?: string;
    notes?: string;
  }): Promise<void> {
    const { discountAmount, finalAmount } = await this.calculateDiscount(
      data.userId, 
      parseFloat(data.amount)
    );

    await this.paymentRecordService.create({
      userId: data.userId,
      paymentType: data.paymentType,
      amount: data.amount,
      discountAmount: discountAmount.toString(),
      dueDate: data.dueDate,
      eventId: data.eventId,
      fixtureId: data.fixtureId,
      paymentMethod: 'MANUAL',
      notes: data.notes
    });
  }

  /**
   * Handle fee deletion and credit user's balance if already paid
   */
  private async handleFeeDeletion(paymentRecordId: string, userId: number): Promise<void> {
    const paymentRecord = await this.prisma.paymentRecord.findUnique({
      where: { id: paymentRecordId }
    });

    if (!paymentRecord) {
      throw new NotFoundException('Payment record not found');
    }

    if (paymentRecord.status === 'PAID') {
      const paidAmount = parseFloat(paymentRecord.paidAmount.toString());
      await this.userBalanceService.adjustBalance(userId, {
        amount: paidAmount.toString(),
        reason: `Fee refund for deleted payment record: ${paymentRecordId}`
      });
    }

    await this.prisma.paymentRecord.delete({
      where: { id: paymentRecordId }
    });
  }
}
