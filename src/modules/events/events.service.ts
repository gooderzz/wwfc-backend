import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventFiltersDto } from './dto/event-filters.dto';
import { CreateRSVPDto } from './dto/rsvp.dto';
import { MarkAttendanceDto, MarkMultipleAttendanceDto } from './dto/attendance.dto';
import { EventType, EventScope, RSVPStatus } from '@prisma/client';
import { EventTypesService } from './event-types.service';
import { FeeIntegrationService } from '../financial/fee-integration.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventTypesService: EventTypesService,
    private readonly feeIntegrationService: FeeIntegrationService,
  ) {}

  async createEvent(createEventDto: CreateEventDto, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { team: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate event data
    this.validateEventData(createEventDto, user);

    // Check permissions
    if (createEventDto.createdFor === EventScope.CLUB_WIDE && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can create club-wide events');
    }

    if (createEventDto.createdFor === EventScope.TEAM_SPECIFIC) {
      if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
        throw new ForbiddenException('Only managers and admins can create team-specific events');
      }
      
      if (createEventDto.teamId && user.teamId !== createEventDto.teamId && user.role !== 'ADMIN') {
        throw new ForbiddenException('Managers can only create events for their own team');
      }
    }

    // Set teamId if not provided for team-specific events
    const teamId = createEventDto.createdFor === EventScope.TEAM_SPECIFIC && !createEventDto.teamId 
      ? user.teamId 
      : createEventDto.teamId;

    // Apply event type-specific logic
    const eventData = await this.applyEventTypeSpecificLogic(createEventDto, teamId || undefined);

    const event = await this.prisma.event.create({
      data: {
        title: createEventDto.title,
        description: createEventDto.description,
        eventType: createEventDto.eventType,
        eventSubtype: createEventDto.eventSubtype,
        startDateTime: new Date(createEventDto.startDateTime),
        endDateTime: createEventDto.endDateTime ? new Date(createEventDto.endDateTime) : null,
        location: createEventDto.location as any,
        address: createEventDto.address,
        cost: eventData.cost,
        maxAttendees: createEventDto.maxAttendees,
        rsvpDeadline: createEventDto.rsvpDeadline ? new Date(createEventDto.rsvpDeadline) : null,
        isRecurring: createEventDto.isRecurring || false,
        recurringRule: createEventDto.recurringRule,
        parentEventId: createEventDto.parentEventId,
        createdBy: userId,
        createdFor: createEventDto.createdFor,
        teamId: teamId || undefined,
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
        invitedUsers: {
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
    });

    return this.addComputedFields(event, userId);
  }

  async findEventsByTeam(teamId: number, userId: number, filters?: EventFiltersDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { team: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has access to this team's events
    if (user.role !== 'ADMIN' && user.teamId !== teamId) {
      throw new ForbiddenException('Access denied to this team\'s events');
    }

    const where: any = {
      isActive: true,
      teamId: teamId,
    };

    // Apply additional filters if provided
    if (filters) {
      if (filters.eventType) where.eventType = filters.eventType;
      if (filters.eventSubtype) where.eventSubtype = filters.eventSubtype;
      if (filters.startDate) {
        where.startDateTime = {
          gte: new Date(filters.startDate),
        };
      }
      if (filters.endDate) {
        where.startDateTime = {
          ...where.startDateTime,
          lte: new Date(filters.endDate),
        };
      }
      if (filters.isRecurring !== undefined) where.isRecurring = filters.isRecurring;
    }

    const events = await this.prisma.event.findMany({
      where,
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

    return events.map(event => this.addComputedFields(event, userId));
  }

  async findAll(filters: EventFiltersDto, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { team: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const where: any = {
      isActive: true,
    };

    // Apply filters
    if (filters.eventType) {
      where.eventType = filters.eventType;
    }

    if (filters.eventSubtype) {
      where.eventSubtype = filters.eventSubtype;
    }

    if (filters.createdFor) {
      where.createdFor = filters.createdFor;
    }

    if (filters.isRecurring !== undefined) {
      where.isRecurring = filters.isRecurring;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === 'true';
    }

    if (filters.startDate) {
      where.startDateTime = {
        gte: new Date(filters.startDate),
      };
    }

    if (filters.endDate) {
      where.startDateTime = {
        ...where.startDateTime,
        lte: new Date(filters.endDate),
      };
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { address: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Add advanced filtering
    if (filters.teamId) {
      where.teamId = parseInt(filters.teamId.toString(), 10);
    }

    // Apply visibility rules
    if (user.role === 'ADMIN') {
      // Admins can see all events
    } else if (user.role === 'MANAGER') {
      // Managers can see club-wide events and their team's events
      where.OR = [
        { createdFor: EventScope.CLUB_WIDE },
        { teamId: user.teamId ? parseInt(user.teamId.toString(), 10) : null },
      ];
    } else {
      // Players can see club-wide events and their team's events
      where.OR = [
        { createdFor: EventScope.CLUB_WIDE },
        { teamId: user.teamId ? parseInt(user.teamId.toString(), 10) : null },
      ];
    }

    const page = parseInt(filters.page?.toString() || '1', 10);
    const limit = parseInt(filters.limit?.toString() || '25', 10);
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
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
          invitedUsers: {
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
        skip,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);

    const eventsWithComputedFields = events.map(event => this.addComputedFields(event, userId));

    return {
      events: eventsWithComputedFields,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { team: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const event = await this.prisma.event.findUnique({
      where: { id },
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
        invitedUsers: {
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
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check visibility
    if (!this.canUserAccessEvent(event, user)) {
      throw new ForbiddenException('Access denied to this event');
    }

    return this.addComputedFields(event, userId);
  }

  async updateEvent(id: string, updateEventDto: UpdateEventDto, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { team: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { creator: true, team: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check permissions
    if (event.createdBy !== userId && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only the event creator or admin can update this event');
    }

    // Validate team changes
    if ('teamId' in updateEventDto && updateEventDto.teamId && event.createdFor === EventScope.TEAM_SPECIFIC) {
      if (user.role !== 'ADMIN' && updateEventDto.teamId !== user.teamId) {
        throw new ForbiddenException('Managers can only assign events to their own team');
      }
    }

    const updateData: any = {};
    
    if ('title' in updateEventDto) updateData.title = updateEventDto.title;
    if ('description' in updateEventDto) updateData.description = updateEventDto.description;
    if ('eventType' in updateEventDto) updateData.eventType = updateEventDto.eventType;
    if ('eventSubtype' in updateEventDto) updateData.eventSubtype = updateEventDto.eventSubtype;
    if ('startDateTime' in updateEventDto) updateData.startDateTime = updateEventDto.startDateTime ? new Date(updateEventDto.startDateTime) : undefined;
    if ('endDateTime' in updateEventDto) updateData.endDateTime = updateEventDto.endDateTime ? new Date(updateEventDto.endDateTime) : undefined;
    if ('location' in updateEventDto) updateData.location = updateEventDto.location as any;
    if ('address' in updateEventDto) updateData.address = updateEventDto.address;
    if ('cost' in updateEventDto) updateData.cost = updateEventDto.cost ? parseFloat(updateEventDto.cost) : undefined;
    if ('maxAttendees' in updateEventDto) updateData.maxAttendees = updateEventDto.maxAttendees;
    if ('rsvpDeadline' in updateEventDto) updateData.rsvpDeadline = updateEventDto.rsvpDeadline ? new Date(updateEventDto.rsvpDeadline) : undefined;
    if ('isRecurring' in updateEventDto) updateData.isRecurring = updateEventDto.isRecurring;
    if ('recurringRule' in updateEventDto) updateData.recurringRule = updateEventDto.recurringRule;
    if ('parentEventId' in updateEventDto) updateData.parentEventId = updateEventDto.parentEventId;
    if ('createdFor' in updateEventDto) updateData.createdFor = updateEventDto.createdFor;
    if ('teamId' in updateEventDto) updateData.teamId = updateEventDto.teamId;

    const updatedEvent = await this.prisma.event.update({
      where: { id },
      data: updateData,
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
        invitedUsers: {
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
    });

    return this.addComputedFields(updatedEvent, userId);
  }

  async removeEvent(id: string, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { creator: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check permissions
    if (event.createdBy !== userId && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only the event creator or admin can delete this event');
    }

    // Handle social event cancellation if it's a social event with fees
    if (event.eventType === 'SOCIAL' && event.cost) {
      try {
        await this.feeIntegrationService.handleSocialEventCancellation(id);
      } catch (error) {
        // Log error but don't fail the event deletion
        console.error(`Failed to handle social event cancellation for event ${id}:`, error);
      }
    }

    // Soft delete by setting isActive to false
    await this.prisma.event.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Event deleted successfully' };
  }

  async createRSVP(eventId: string, createRSVPDto: CreateRSVPDto, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { rsvps: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if user can access this event
    if (!this.canUserAccessEvent(event, user)) {
      throw new ForbiddenException('Access denied to this event');
    }

    // Check RSVP deadline
    if (event.rsvpDeadline && new Date() > event.rsvpDeadline) {
      throw new ForbiddenException('RSVP deadline has passed');
    }

    // Determine target user ID
    const targetUserId = createRSVPDto.userId || userId;

    // Check if the current user can RSVP for the target user
    if (targetUserId !== userId) {
      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      
      if (!currentUser || (currentUser.role !== 'MANAGER' && currentUser.role !== 'ADMIN')) {
        throw new ForbiddenException('Only managers and admins can RSVP for other users');
      }
    }

    const rsvp = await this.prisma.eventRSVP.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId: targetUserId,
        },
      },
      update: {
        status: createRSVPDto.status,
      },
      create: {
        eventId,
        userId: targetUserId,
        status: createRSVPDto.status,
      },
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
    });

    return rsvp;
  }

  async markAttendance(eventId: string, markAttendanceDto: MarkAttendanceDto, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user can mark attendance
    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only managers and admins can mark attendance');
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if user can access this event
    if (!this.canUserAccessEvent(event, user)) {
      throw new ForbiddenException('Access denied to this event');
    }

    const attendance = await this.prisma.eventAttendance.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId: markAttendanceDto.userId,
        },
      },
      update: {
        markedBy: userId,
        markedAt: new Date(),
      },
      create: {
        eventId,
        userId: markAttendanceDto.userId,
        markedBy: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create training fee if this is a training event
    if (event.eventType === 'TRAINING') {
      try {
        await this.feeIntegrationService.createTrainingFeeForUser(
          markAttendanceDto.userId,
          eventId,
          event.startDateTime
        );
      } catch (error) {
        // Log the error but don't fail the attendance marking
        console.error('Failed to create training fee for attendance:', error);
      }
    }

    return attendance;
  }

  async markMultipleAttendance(eventId: string, markMultipleAttendanceDto: MarkMultipleAttendanceDto, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user can mark attendance
    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only managers and admins can mark attendance');
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if user can access this event
    if (!this.canUserAccessEvent(event, user)) {
      throw new ForbiddenException('Access denied to this event');
    }

    const attendances = await Promise.all(
      markMultipleAttendanceDto.userIds.map(targetUserId =>
        this.prisma.eventAttendance.upsert({
          where: {
            eventId_userId: {
              eventId,
              userId: targetUserId,
            },
          },
          update: {
            markedBy: userId,
            markedAt: new Date(),
          },
          create: {
            eventId,
            userId: targetUserId,
            markedBy: userId,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        })
      )
    );

    return attendances;
  }

  private canUserAccessEvent(event: any, user: any): boolean {
    if (user.role === 'ADMIN') {
      return true;
    }

    if (event.createdFor === EventScope.CLUB_WIDE) {
      return true;
    }

    if (event.createdFor === EventScope.TEAM_SPECIFIC && event.teamId === user.teamId) {
      return true;
    }

    return false;
  }

  private validateEventData(createEventDto: CreateEventDto, user: any) {
    // Validate start date is in the future
    const startDate = new Date(createEventDto.startDateTime);
    if (startDate <= new Date()) {
      throw new ForbiddenException('Event start date must be in the future');
    }

    // Validate end date is after start date
    if (createEventDto.endDateTime) {
      const endDate = new Date(createEventDto.endDateTime);
      if (endDate <= startDate) {
        throw new ForbiddenException('Event end date must be after start date');
      }
    }

    // Validate RSVP deadline is before event start
    if (createEventDto.rsvpDeadline) {
      const deadline = new Date(createEventDto.rsvpDeadline);
      if (deadline >= startDate) {
        throw new ForbiddenException('RSVP deadline must be before event start date');
      }
    }

    // Validate max attendees is positive
    if (createEventDto.maxAttendees && createEventDto.maxAttendees <= 0) {
      throw new ForbiddenException('Maximum attendees must be a positive number');
    }

    // Validate cost is positive
    if (createEventDto.cost && parseFloat(createEventDto.cost) < 0) {
      throw new ForbiddenException('Event cost cannot be negative');
    }

    // Validate event type-specific requirements
    this.validateEventTypeSpecificRequirements(createEventDto, user);
  }

  private validateEventTypeSpecificRequirements(createEventDto: CreateEventDto, user: any) {
    // Use EventTypesService for comprehensive validation
    const validation = this.eventTypesService.validateEventData(
      createEventDto.eventType,
      createEventDto,
      user.role,
    );

    if (!validation.isValid) {
      throw new ForbiddenException(validation.errors.join(', '));
    }

    // Additional business logic validation
    // Note: End time is optional for all event types
  }

  private async applyEventTypeSpecificLogic(createEventDto: CreateEventDto, teamId: number | undefined) {
    let cost = createEventDto.cost ? parseFloat(createEventDto.cost) : null;

    // Apply training cost if not specified
    if (createEventDto.eventType === EventType.TRAINING && !cost) {
      const trainingConfig = await this.prisma.paymentConfig.findUnique({
        where: { paymentType: 'TRAINING_FEE' },
      });
      if (trainingConfig && trainingConfig.isActive) {
        cost = Number(trainingConfig.amount);
      }
    }

    // Note: End time is optional for all event types - no default setting

    return { cost };
  }

  private addComputedFields(event: any, userId?: number) {
    // Ensure rsvps, attendees, and invitedUsers arrays exist
    const rsvps = event.rsvps || [];
    const attendees = event.attendees || [];
    const invitedUsers = event.invitedUsers || [];

    const rsvpCount = {
      YES: rsvps.filter((rsvp: any) => rsvp.status === RSVPStatus.YES).length,
      NO: rsvps.filter((rsvp: any) => rsvp.status === RSVPStatus.NO).length,
      MAYBE: rsvps.filter((rsvp: any) => rsvp.status === RSVPStatus.MAYBE).length,
    };

    // Find current user's RSVP status
    const currentUserRSVP = userId 
      ? rsvps.find((rsvp: any) => rsvp.userId === userId)?.status || null
      : null;

    return {
      ...event,
      rsvpCount,
      attendanceCount: attendees.length,
      invitationCount: invitedUsers.length,
      currentUserRSVP,
    };
  }

  async getAttendance(eventId: string, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user can view attendance
    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only managers and admins can view attendance');
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if user can access this event
    if (!this.canUserAccessEvent(event, user)) {
      throw new ForbiddenException('Access denied to this event');
    }

    const attendance = await this.prisma.eventAttendance.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        markedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { markedAt: 'desc' },
    });



    return attendance;
  }

  async removeAttendance(eventId: string, targetUserId: number, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user can remove attendance
    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only managers and admins can remove attendance');
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if user can access this event
    if (!this.canUserAccessEvent(event, user)) {
      throw new ForbiddenException('Access denied to this event');
    }

    const attendance = await this.prisma.eventAttendance.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: targetUserId,
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    await this.prisma.eventAttendance.delete({
      where: {
        eventId_userId: {
          eventId,
          userId: targetUserId,
        },
      },
    });

    return { message: 'Attendance removed successfully' };
  }
}
