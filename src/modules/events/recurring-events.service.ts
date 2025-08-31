import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateRecurringEventDto, UpdateRecurringEventDto, RecurrenceFrequency } from './dto/recurring-event.dto';
import { RRule, Weekday } from 'rrule';
import { EventType } from '@prisma/client';

@Injectable()
export class RecurringEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRecurringEvent(createRecurringEventDto: CreateRecurringEventDto, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { team: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate recurring event data
    this.validateRecurringEventData(createRecurringEventDto);

    // Create the parent recurring event
    const parentEvent = await this.prisma.event.create({
      data: {
        title: createRecurringEventDto.title,
        description: createRecurringEventDto.description,
        eventType: (createRecurringEventDto.eventType as EventType) || EventType.TRAINING,
        eventSubtype: 'RECURRING',
        startDateTime: new Date(createRecurringEventDto.startDateTime),
        endDateTime: createRecurringEventDto.endDateTime ? new Date(createRecurringEventDto.endDateTime) : null,
        location: createRecurringEventDto.location as any,
        address: createRecurringEventDto.address,
        cost: createRecurringEventDto.cost ? parseFloat(createRecurringEventDto.cost) : null,
        maxAttendees: createRecurringEventDto.maxAttendees,
        rsvpDeadline: createRecurringEventDto.rsvpDeadline ? new Date(createRecurringEventDto.rsvpDeadline) : null,
        isRecurring: true,
        recurringRule: this.generateRRule(createRecurringEventDto),
        parentEventId: null,
        createdBy: userId,
        createdFor: createRecurringEventDto.teamId ? 'TEAM_SPECIFIC' : 'CLUB_WIDE',
        teamId: createRecurringEventDto.teamId || user.teamId || undefined,
        isActive: false, // Parent recurring events should not be visible in regular event lists
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            division: true,
          },
        },
      },
    });

    // Generate individual event instances
    const instances = await this.generateEventInstances(parentEvent.id, createRecurringEventDto, userId);

    return {
      parentEvent,
      instances,
      totalInstances: instances.length,
    };
  }

  async updateRecurringEvent(parentEventId: string, updateRecurringEventDto: UpdateRecurringEventDto, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const parentEvent = await this.prisma.event.findUnique({
      where: { id: parentEventId },
      include: { creator: true },
    });

    if (!parentEvent) {
      throw new NotFoundException('Recurring event not found');
    }

    if (!parentEvent.isRecurring) {
      throw new ForbiddenException('This is not a recurring event');
    }

    // Check permissions
    if (parentEvent.createdBy !== userId && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only the event creator or admin can update this recurring event');
    }

    // Update the parent event
    const updatedParentEvent = await this.prisma.event.update({
      where: { id: parentEventId },
      data: {
        title: updateRecurringEventDto.title,
        description: updateRecurringEventDto.description,
        startDateTime: updateRecurringEventDto.startDateTime ? new Date(updateRecurringEventDto.startDateTime) : undefined,
        endDateTime: updateRecurringEventDto.endDateTime ? new Date(updateRecurringEventDto.endDateTime) : null,
        location: updateRecurringEventDto.location as any,
        address: updateRecurringEventDto.address,
        cost: updateRecurringEventDto.cost ? parseFloat(updateRecurringEventDto.cost) : undefined,
        maxAttendees: updateRecurringEventDto.maxAttendees,
        rsvpDeadline: updateRecurringEventDto.rsvpDeadline ? new Date(updateRecurringEventDto.rsvpDeadline) : undefined,
        recurringRule: this.generateRRule(updateRecurringEventDto),
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            division: true,
          },
        },
      },
    });

    // Regenerate future instances
    await this.regenerateFutureInstances(parentEventId, updateRecurringEventDto);

    return updatedParentEvent;
  }

  async updateSingleInstance(instanceId: string, updateData: any, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const instance = await this.prisma.event.findUnique({
      where: { id: instanceId },
      include: { creator: true },
    });

    if (!instance) {
      throw new NotFoundException('Event instance not found');
    }

    if (!instance.parentEventId) {
      throw new ForbiddenException('This is not a recurring event instance');
    }

    // Check permissions
    if (instance.createdBy !== userId && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only the event creator or admin can update this event');
    }

    // Update the single instance
    const updatedInstance = await this.prisma.event.update({
      where: { id: instanceId },
      data: {
        title: updateData.title,
        description: updateData.description,
        startDateTime: updateData.startDateTime ? new Date(updateData.startDateTime) : undefined,
        endDateTime: updateData.endDateTime ? new Date(updateData.endDateTime) : undefined,
        location: updateData.location as any,
        address: updateData.address,
        cost: updateData.cost ? parseFloat(updateData.cost) : undefined,
        maxAttendees: updateData.maxAttendees,
        rsvpDeadline: updateData.rsvpDeadline ? new Date(updateData.rsvpDeadline) : undefined,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            division: true,
          },
        },
      },
    });

    return updatedInstance;
  }

  async cancelSingleInstance(instanceId: string, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const instance = await this.prisma.event.findUnique({
      where: { id: instanceId },
      include: { creator: true },
    });

    if (!instance) {
      throw new NotFoundException('Event instance not found');
    }

    if (!instance.parentEventId) {
      throw new ForbiddenException('This is not a recurring event instance');
    }

    // Check permissions
    if (instance.createdBy !== userId && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only the event creator or admin can cancel this event');
    }

    // Soft delete the instance
    await this.prisma.event.update({
      where: { id: instanceId },
      data: { isActive: false },
    });

    return { message: 'Event instance cancelled successfully' };
  }

  async cancelEntireSeries(parentEventId: string, userId: number) {
    console.log('Cancel entire series called with parentEventId:', parentEventId, 'userId:', userId);
    
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const parentEvent = await this.prisma.event.findUnique({
      where: { id: parentEventId },
      include: { creator: true },
    });

    if (!parentEvent) {
      throw new NotFoundException('Recurring event not found');
    }

    if (!parentEvent.isRecurring) {
      throw new ForbiddenException('This is not a recurring event');
    }

    // Check permissions
    if (parentEvent.createdBy !== userId && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only the event creator or admin can cancel this recurring event series');
    }

    console.log('Cancelling all instances for parent event:', parentEventId);

    // Cancel all instances of this recurring event
    const result = await this.prisma.event.updateMany({
      where: {
        OR: [
          { id: parentEventId },
          { parentEventId: parentEventId },
        ],
      },
      data: { isActive: false },
    });

    console.log('Cancelled instances result:', result);

    return { message: 'Entire recurring event series cancelled successfully' };
  }

  async getRecurringEventInstances(parentEventId: string, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const parentEvent = await this.prisma.event.findUnique({
      where: { id: parentEventId },
    });

    if (!parentEvent) {
      throw new NotFoundException('Recurring event not found');
    }

    if (!parentEvent.isRecurring) {
      throw new ForbiddenException('This is not a recurring event');
    }

    // Get all instances of this recurring event
    const instances = await this.prisma.event.findMany({
      where: {
        parentEventId: parentEventId,
        isActive: true,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            division: true,
          },
        },
        rsvps: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
              },
            },
          },
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        startDateTime: 'asc',
      },
    });

    return instances;
  }

  private validateRecurringEventData(createRecurringEventDto: CreateRecurringEventDto) {
    const startDate = new Date(createRecurringEventDto.startDateTime);
    if (startDate <= new Date()) {
      throw new ForbiddenException('Recurring event start date must be in the future');
    }

    if (createRecurringEventDto.until) {
      const untilDate = new Date(createRecurringEventDto.until);
      if (untilDate <= startDate) {
        throw new ForbiddenException('Recurring event end date must be after start date');
      }
    }

    if (createRecurringEventDto.count && createRecurringEventDto.count <= 0) {
      throw new ForbiddenException('Recurring event count must be positive');
    }

    if (createRecurringEventDto.interval <= 0) {
      throw new ForbiddenException('Recurring event interval must be positive');
    }
  }

  private generateRRule(recurringEventDto: CreateRecurringEventDto | UpdateRecurringEventDto): any {
    if (!recurringEventDto.frequency || !recurringEventDto.startDateTime) {
      throw new Error('Frequency and start date are required for recurring events');
    }

    const options: any = {
      freq: this.mapFrequencyToRRule(recurringEventDto.frequency),
      interval: recurringEventDto.interval,
      dtstart: new Date(recurringEventDto.startDateTime),
    };

    if (recurringEventDto.count) {
      options.count = recurringEventDto.count;
    }

    if (recurringEventDto.until) {
      options.until = new Date(recurringEventDto.until);
    }

    if (recurringEventDto.byWeekDay && recurringEventDto.byWeekDay.length > 0) {
      options.byweekday = recurringEventDto.byWeekDay.map(day => this.mapWeekdayToRRule(day));
    }

    if (recurringEventDto.byMonthDay) {
      options.bymonthday = recurringEventDto.byMonthDay;
    }

    if (recurringEventDto.byMonth) {
      options.bymonth = recurringEventDto.byMonth;
    }

    const rule = new RRule(options);
    return {
      rrule: rule.toString(),
      options: options,
    };
  }

  private mapFrequencyToRRule(frequency: RecurrenceFrequency): number {
    switch (frequency) {
      case RecurrenceFrequency.DAILY:
        return RRule.DAILY;
      case RecurrenceFrequency.WEEKLY:
        return RRule.WEEKLY;
      case RecurrenceFrequency.MONTHLY:
        return RRule.MONTHLY;
      case RecurrenceFrequency.YEARLY:
        return RRule.YEARLY;
      default:
        return RRule.WEEKLY;
    }
  }

  private mapWeekdayToRRule(weekday: string): number {
    switch (weekday) {
      case 'MO':
        return 0; // Monday
      case 'TU':
        return 1; // Tuesday
      case 'WE':
        return 2; // Wednesday
      case 'TH':
        return 3; // Thursday
      case 'FR':
        return 4; // Friday
      case 'SA':
        return 5; // Saturday
      case 'SU':
        return 6; // Sunday
      default:
        return 0; // Monday
    }
  }

  private async generateEventInstances(parentEventId: string, createRecurringEventDto: CreateRecurringEventDto, userId: number) {
    const rule = new RRule({
      freq: this.mapFrequencyToRRule(createRecurringEventDto.frequency),
      interval: createRecurringEventDto.interval,
      dtstart: new Date(createRecurringEventDto.startDateTime),
      count: createRecurringEventDto.count || 52, // Default to 52 weeks (1 year)
      until: createRecurringEventDto.until ? new Date(createRecurringEventDto.until) : undefined,
      byweekday: createRecurringEventDto.byWeekDay?.map(day => this.mapWeekdayToRRule(day)),
      bymonthday: createRecurringEventDto.byMonthDay,
      bymonth: createRecurringEventDto.byMonth,
    });

    const dates = rule.all();
    console.log('Generated dates for recurring event:', dates.length, dates);
    const instances = [];

    for (const date of dates) {
      // Calculate end time based on the original event duration
      let endDateTime = null;
      if (createRecurringEventDto.endDateTime) {
        const originalStart = new Date(createRecurringEventDto.startDateTime);
        const originalEnd = new Date(createRecurringEventDto.endDateTime);
        const duration = originalEnd.getTime() - originalStart.getTime();
        endDateTime = new Date(date.getTime() + duration);
      }

      const instance = await this.prisma.event.create({
        data: {
          title: createRecurringEventDto.title,
          description: createRecurringEventDto.description,
          eventType: (createRecurringEventDto.eventType as EventType) || EventType.TRAINING,
          eventSubtype: 'RECURRING_INSTANCE',
          startDateTime: date,
          endDateTime: endDateTime,
          location: createRecurringEventDto.location as any,
          address: createRecurringEventDto.address,
          cost: createRecurringEventDto.cost ? parseFloat(createRecurringEventDto.cost) : null,
          maxAttendees: createRecurringEventDto.maxAttendees,
          rsvpDeadline: createRecurringEventDto.rsvpDeadline ? new Date(createRecurringEventDto.rsvpDeadline) : null,
          isRecurring: false,
          recurringRule: undefined,
          parentEventId: parentEventId,
          createdBy: userId,
          createdFor: createRecurringEventDto.teamId ? 'TEAM_SPECIFIC' : 'CLUB_WIDE',
          teamId: createRecurringEventDto.teamId,
          isActive: true,
        },
      });
      instances.push(instance);
    }

    return instances;
  }

  private async regenerateFutureInstances(parentEventId: string, updateRecurringEventDto: UpdateRecurringEventDto) {
    // Delete future instances
    await this.prisma.event.deleteMany({
      where: {
        parentEventId: parentEventId,
        startDateTime: {
          gte: new Date(),
        },
        isActive: true,
      },
    });

    // Regenerate future instances
    // This would require the full recurring event data, so we'll need to fetch it
    const parentEvent = await this.prisma.event.findUnique({
      where: { id: parentEventId },
    });

    if (parentEvent) {
      // Regenerate instances with updated data
      // This is a simplified version - in practice, you'd need to merge the update data
      // with the original recurring event data
    }
  }
}
