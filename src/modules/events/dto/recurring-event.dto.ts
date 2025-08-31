import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { EventType } from '@prisma/client';

export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum RecurrenceWeekday {
  MONDAY = 'MO',
  TUESDAY = 'TU',
  WEDNESDAY = 'WE',
  THURSDAY = 'TH',
  FRIDAY = 'FR',
  SATURDAY = 'SA',
  SUNDAY = 'SU',
}

export class CreateRecurringEventDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startDateTime: string;

  @IsOptional()
  @IsDateString()
  endDateTime?: string;

  @IsEnum(RecurrenceFrequency)
  frequency: RecurrenceFrequency;

  @IsNumber()
  @Min(1)
  @Max(999)
  interval: number; // Every X days/weeks/months/years

  @IsOptional()
  @IsNumber()
  @Min(1)
  count?: number; // Number of occurrences

  @IsOptional()
  @IsDateString()
  until?: string; // End date for recurrence

  @IsOptional()
  @IsEnum(RecurrenceWeekday, { each: true })
  byWeekDay?: RecurrenceWeekday[]; // For weekly recurrence

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  byMonthDay?: number; // For monthly recurrence

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  byMonth?: number; // For yearly recurrence

  // Other event fields
  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  cost?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxAttendees?: number;

  @IsOptional()
  @IsDateString()
  rsvpDeadline?: string;

  @IsOptional()
  @IsNumber()
  teamId?: number;

  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @IsOptional()
  @IsString()
  eventSubtype?: string;

  @IsOptional()
  @IsNumber()
  createdBy?: number;
}

export class UpdateRecurringEventDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startDateTime?: string;

  @IsOptional()
  @IsDateString()
  endDateTime?: string;

  @IsOptional()
  @IsEnum(RecurrenceFrequency)
  frequency?: RecurrenceFrequency;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(999)
  interval?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  count?: number;

  @IsOptional()
  @IsDateString()
  until?: string;

  @IsOptional()
  @IsEnum(RecurrenceWeekday, { each: true })
  byWeekDay?: RecurrenceWeekday[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  byMonthDay?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  byMonth?: number;

  // Other event fields
  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  cost?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxAttendees?: number;

  @IsOptional()
  @IsDateString()
  rsvpDeadline?: string;

  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @IsOptional()
  @IsString()
  eventSubtype?: string;
}
