import { IsOptional, IsEnum, IsString, IsNumber, IsDateString, IsBoolean } from 'class-validator';
import { EventType, EventScope } from '@prisma/client';

export class EventFiltersDto {
  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @IsOptional()
  @IsString()
  eventSubtype?: string;

  @IsOptional()
  @IsEnum(EventScope)
  createdFor?: EventScope;

  @IsOptional()
  @IsNumber()
  teamId?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  isActive?: string;

  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  limit?: number = 25;

  @IsOptional()
  @IsString()
  search?: string;
}
