import { IsString, IsOptional, IsDateString, IsEnum, IsNumber, IsBoolean, IsDecimal, IsInt, Min, Max } from 'class-validator';
import { EventType, EventScope } from '@prisma/client';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(EventType)
  eventType: EventType;

  @IsOptional()
  @IsString()
  eventSubtype?: string;

  @IsDateString()
  startDateTime: string;

  @IsOptional()
  @IsDateString()
  endDateTime?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  cost?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttendees?: number;

  @IsOptional()
  @IsDateString()
  rsvpDeadline?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  recurringRule?: any; // RRULE format JSON

  @IsOptional()
  @IsString()
  parentEventId?: string;

  @IsEnum(EventScope)
  createdFor: EventScope;

  @IsOptional()
  @IsNumber()
  teamId?: number;
}
