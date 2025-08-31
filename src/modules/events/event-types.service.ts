import { Injectable } from '@nestjs/common';
import { EventType } from '@prisma/client';

@Injectable()
export class EventTypesService {
  // Define valid event subtypes for each event type
  private readonly eventTypeSubtypes = {
    [EventType.FIXTURE]: ['LEAGUE', 'CUP', 'FRIENDLY', 'TOURNAMENT'],
    [EventType.TRAINING]: ['SMALL_SIDED', 'MAIN_TRAINING', 'FITNESS'],
    [EventType.SOCIAL]: ['CLUB_SOCIAL', 'TEAM_SOCIAL', 'FUNDRAISER', 'TOURNAMENT_SOCIAL'],
    [EventType.AWARDS]: ['END_OF_SEASON', 'PLAYER_OF_THE_MONTH', 'MANAGERS_CHOICE', 'TEAM_AWARDS'],
  };

  // Define required fields for each event type
  private readonly eventTypeRequirements = {
    [EventType.FIXTURE]: {
      required: ['title', 'startDateTime', 'teamId'],
      optional: ['endDateTime', 'location', 'address', 'cost', 'maxAttendees', 'rsvpDeadline'],
      defaultScope: 'TEAM_SPECIFIC',
      allowedScopes: ['TEAM_SPECIFIC'],
      allowedRoles: ['MANAGER', 'ADMIN'],
    },
    [EventType.TRAINING]: {
      required: ['title', 'startDateTime', 'eventSubtype'],
      optional: ['endDateTime', 'location', 'address', 'cost', 'maxAttendees', 'rsvpDeadline', 'teamId'],
      defaultScope: 'TEAM_SPECIFIC',
      allowedScopes: ['TEAM_SPECIFIC', 'CLUB_WIDE'],
      allowedRoles: ['MANAGER', 'ADMIN'],
    },
    [EventType.SOCIAL]: {
      required: ['title', 'startDateTime'],
      optional: ['endDateTime', 'location', 'address', 'cost', 'maxAttendees', 'rsvpDeadline', 'teamId'],
      defaultScope: 'TEAM_SPECIFIC',
      allowedScopes: ['TEAM_SPECIFIC', 'CLUB_WIDE'],
      allowedRoles: ['MANAGER', 'ADMIN'],
    },
    [EventType.AWARDS]: {
      required: ['title', 'startDateTime', 'endDateTime'],
      optional: ['location', 'address', 'cost', 'maxAttendees', 'rsvpDeadline'],
      defaultScope: 'CLUB_WIDE',
      allowedScopes: ['CLUB_WIDE'],
      allowedRoles: ['ADMIN'],
    },
  };

  // Define event type-specific features
  private readonly eventTypeFeatures = {
    [EventType.FIXTURE]: {
      hasRSVP: true,
      hasAttendance: false, // Fixtures don't track attendance, they track who played
      hasCost: false,
      hasMaxAttendees: false,
      hasRecurring: false,
      hasInvitations: false,
    },
    [EventType.TRAINING]: {
      hasRSVP: true,
      hasAttendance: true,
      hasCost: true,
      hasMaxAttendees: true,
      hasRecurring: true,
      hasInvitations: true,
    },
    [EventType.SOCIAL]: {
      hasRSVP: true,
      hasAttendance: false,
      hasCost: true,
      hasMaxAttendees: true,
      hasRecurring: false,
      hasInvitations: true,
    },
    [EventType.AWARDS]: {
      hasRSVP: true,
      hasAttendance: true,
      hasCost: true,
      hasMaxAttendees: true,
      hasRecurring: false,
      hasInvitations: false,
    },
  };

  /**
   * Get all valid event types
   */
  getEventTypes(): EventType[] {
    return Object.values(EventType);
  }

  /**
   * Get valid subtypes for a specific event type
   */
  getEventTypeSubtypes(eventType: EventType): string[] {
    return this.eventTypeSubtypes[eventType] || [];
  }

  /**
   * Validate if a subtype is valid for a given event type
   */
  isValidSubtype(eventType: EventType, subtype: string): boolean {
    const validSubtypes = this.getEventTypeSubtypes(eventType);
    return validSubtypes.includes(subtype);
  }

  /**
   * Get requirements for a specific event type
   */
  getEventTypeRequirements(eventType: EventType) {
    return this.eventTypeRequirements[eventType] || {};
  }

  /**
   * Get features for a specific event type
   */
  getEventTypeFeatures(eventType: EventType) {
    return this.eventTypeFeatures[eventType] || {};
  }

  /**
   * Validate event data against event type requirements
   */
  validateEventData(eventType: EventType, eventData: any, userRole: string): { isValid: boolean; errors: string[] } {
    const requirements = this.getEventTypeRequirements(eventType);
    const errors: string[] = [];

    // Check required fields
    for (const field of requirements.required) {
      if (!eventData[field]) {
        errors.push(`${field} is required for ${eventType} events`);
      }
    }

    // Check if user role is allowed for this event type
    if (!requirements.allowedRoles.includes(userRole)) {
      errors.push(`User role ${userRole} is not allowed to create ${eventType} events`);
    }

    // Check if scope is allowed for this event type
    if (eventData.createdFor && !requirements.allowedScopes.includes(eventData.createdFor)) {
      errors.push(`Scope ${eventData.createdFor} is not allowed for ${eventType} events`);
    }

    // Check if subtype is valid
    if (eventData.eventSubtype && !this.isValidSubtype(eventType, eventData.eventSubtype)) {
      errors.push(`Invalid subtype ${eventData.eventSubtype} for ${eventType} events`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get default values for an event type
   */
  getEventTypeDefaults(eventType: EventType): any {
    const requirements = this.getEventTypeRequirements(eventType);
    const features = this.getEventTypeFeatures(eventType);

    return {
      createdFor: requirements.defaultScope,
      isRecurring: features.hasRecurring ? false : undefined,
      hasRSVP: features.hasRSVP,
      hasAttendance: features.hasAttendance,
      hasCost: features.hasCost,
      hasMaxAttendees: features.hasMaxAttendees,
      hasRecurring: features.hasRecurring,
      hasInvitations: features.hasInvitations,
    };
  }

  /**
   * Get event type display information
   */
  getEventTypeDisplayInfo(eventType: EventType) {
    const displayNames = {
      [EventType.FIXTURE]: 'Fixture',
      [EventType.TRAINING]: 'Training',
      [EventType.SOCIAL]: 'Social Event',
      [EventType.AWARDS]: 'Awards Event',
    };

    const descriptions = {
      [EventType.FIXTURE]: 'Competitive matches and games',
      [EventType.TRAINING]: 'Practice sessions and skill development',
      [EventType.SOCIAL]: 'Club social activities and events',
      [EventType.AWARDS]: 'Awards ceremonies and recognition events',
    };

    return {
      name: displayNames[eventType] || eventType,
      description: descriptions[eventType] || '',
      subtypes: this.getEventTypeSubtypes(eventType),
      features: this.getEventTypeFeatures(eventType),
    };
  }

  /**
   * Get all event types with their display information
   */
  getAllEventTypesInfo() {
    return this.getEventTypes().map(eventType => ({
      type: eventType,
      ...this.getEventTypeDisplayInfo(eventType),
    }));
  }
}
