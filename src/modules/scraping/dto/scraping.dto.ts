import { IsString, IsOptional, IsBoolean, IsNumber, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class ScrapeTableDto {
  @IsString()
  divisionId: string;

  @IsString()
  seasonId: string;

  @IsOptional()
  @IsString()
  leagueId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  forceRefresh?: boolean;
}

export class ScrapeDivisionDto {
  @IsString()
  divisionId: string;

  @IsOptional()
  @IsString()
  seasonId?: string;

  @IsOptional()
  @IsString()
  leagueId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeHistorical?: boolean;
}

export class ScrapeMultipleDto {
  @IsArray()
  @IsString({ each: true })
  divisionIds: string[];

  @IsOptional()
  @IsString()
  seasonId?: string;

  @IsOptional()
  @IsString()
  leagueId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  parallel?: boolean;
}

export class ScrapingConfigDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  safeMode?: boolean;

  @IsOptional()
  @IsNumber()
  rateLimitDelay?: number;

  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class ScrapingLogsDto {
  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  level?: 'debug' | 'info' | 'warn' | 'error';

  @IsOptional()
  @IsString()
  divisionId?: string;

  @IsOptional()
  @IsString()
  seasonId?: string;
}
