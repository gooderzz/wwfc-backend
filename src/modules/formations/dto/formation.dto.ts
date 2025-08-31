import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PositionCategory } from '@prisma/client';

export class FormationPositionDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsEnum(PositionCategory)
  category: PositionCategory;

  @IsNumber()
  displayOrder: number;

  @IsBoolean()
  isDefensive: boolean;
}

export class CreateFormationDto {
  @IsString()
  id: string;

  @IsNumber()
  @IsOptional()
  version?: number;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormationPositionDto)
  positions: FormationPositionDto[];
}

export class UpdateFormationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  version?: number;
}

export class FormationResponseDto {
  id: string;
  version: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  positions: FormationPositionDto[];
}

export class FormationStatsResponseDto {
  formationId: string;
  formationName: string;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  winRate: number;
  avgGoalsScored: number;
  avgGoalsConceded: number;
}

export class TeamSelectionWithFormationDto {
  id: string;
  fixtureId: number;
  formationId: string;
  version: number;
  starting11: any; // JsonValue from Prisma
  substitutes: any; // JsonValue from Prisma
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  formation: FormationResponseDto;
}

export class FormationChangeDto {
  @IsString()
  formationId: string;

  @IsBoolean()
  @IsOptional()
  resetTeamSelection?: boolean;
}

export class FormationTeamSelectionDto {
  @IsString()
  formationId: string;

  @IsOptional()
  starting11?: Record<string, number | null>;

  @IsArray()
  @IsOptional()
  substitutes?: number[];

  @IsNumber()
  @IsOptional()
  version?: number;
}
