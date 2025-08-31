import { EventType, EventScope, RSVPStatus } from '@prisma/client';

export class EventRSVPResponseDto {
  id: string;
  userId: number;
  status: RSVPStatus;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
  };
}

export class EventAttendanceResponseDto {
  id: string;
  userId: number;
  markedBy: number;
  markedAt: Date;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export class EventInvitationResponseDto {
  id: string;
  userId: number;
  invitedBy: number;
  invitedAt: Date;
  accepted: boolean | null;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export class EventResponseDto {
  id: string;
  title: string;
  description: string | null;
  eventType: EventType;
  eventSubtype: string | null;
  startDateTime: Date;
  endDateTime: Date | null;
  location: string | null;
  address: string | null;
  cost: number | null;
  maxAttendees: number | null;
  rsvpDeadline: Date | null;
  isRecurring: boolean;
  recurringRule: any | null;
  parentEventId: string | null;
  createdBy: number;
  createdFor: EventScope;
  teamId: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  creator: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  team: {
    id: number;
    name: string;
    division: string;
  } | null;
  rsvps: EventRSVPResponseDto[];
  attendees: EventAttendanceResponseDto[];
  invitedUsers: EventInvitationResponseDto[];
  
  // Computed fields
  rsvpCount: {
    YES: number;
    NO: number;
    MAYBE: number;
  };
  attendanceCount: number;
  invitationCount: number;
}
