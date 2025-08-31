import { IsInt, IsOptional, Min } from 'class-validator';

export class PlayerStatsDto {
  @IsInt()
  userId: number;

  @IsInt()
  @Min(0)
  goals: number;

  @IsInt()
  @Min(0)
  assists: number;

  @IsOptional()
  @IsInt()
  rating?: number;
}
