import { IsInt, Min, IsOptional, IsString, IsEnum, IsBoolean, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export enum ResultType {
  ACTUAL_GAME = 'ACTUAL_GAME',
  WALKOVER = 'WALKOVER',
  POSTPONEMENT = 'POSTPONEMENT'
}

export enum WalkoverType {
  HOME_WALKOVER = 'HOME_WALKOVER',
  AWAY_WALKOVER = 'AWAY_WALKOVER'
}

export enum MatchEventType {
  GOAL = 'GOAL',
  CARD = 'CARD',
  SUBSTITUTION = 'SUBSTITUTION',
  PENALTY_SAVE = 'PENALTY_SAVE',
  PENALTY_MISS = 'PENALTY_MISS'
}

export enum CardType {
  YELLOW = 'YELLOW',
  RED = 'RED',
  SIN_BIN = 'SIN_BIN'
}

export class MatchEventDto {
  @IsEnum(MatchEventType)
  eventType: MatchEventType;

  @IsInt()
  @Min(1)
  minute: number;

  @IsInt()
  playerId: number;

  @IsOptional()
  @IsEnum(['OPEN_PLAY', 'PENALTY', 'SET_PIECE_DIRECT', 'SET_PIECE_INDIRECT', 'OPPONENT_OWN_GOAL', 'OWN_GOAL'])
  goalType?: string;

  @IsOptional()
  @IsInt()
  assistedById?: number;

  @IsOptional()
  @IsEnum(CardType)
  cardType?: CardType;

  @IsOptional()
  @IsInt()
  substitutedForId?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateResultDto {
  @IsEnum(ResultType)
  resultType: ResultType;

  @IsOptional()
  @IsEnum(WalkoverType)
  walkoverType?: WalkoverType;

  @IsOptional()
  @IsString()
  postponementReason?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  homeGoals?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  awayGoals?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalSaves?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatchEventDto)
  matchEvents?: MatchEventDto[];

  @IsOptional()
  @IsString()
  actualFormationId?: string; // Formation used in the actual game

  @IsOptional()
  @IsString()
  plannedFormationId?: string; // Formation that was planned

  @IsOptional()
  @IsBoolean()
  formationChanged?: boolean; // Whether formation changed from planned to actual
}
