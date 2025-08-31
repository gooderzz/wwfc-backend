import { IsString, IsDateString, IsInt, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Location, FixtureType } from '@prisma/client';

export class CreateFixtureDto {
  @IsInt()
  teamId: number;

  @IsEnum(FixtureType)
  fixtureType: FixtureType;

  @IsString()
  opponent: string;

  @IsOptional()
  @IsString()
  cupName?: string;

  @IsDateString()
  date: string;

  // Accept time-only strings like "HH:MM"; controller will combine with date
  @IsString()
  kickOffTime: string;

  @IsEnum(Location)
  location: Location;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  seasonId?: string;
}
