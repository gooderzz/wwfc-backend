import { IsArray, ValidateNested, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class VoteDto {
  @IsInt()
  userId: number;

  @IsInt()
  @Min(1)
  @Max(3)
  rank: number;
}

export class BonusVoteDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VoteDto)
  votes: VoteDto[];
}
