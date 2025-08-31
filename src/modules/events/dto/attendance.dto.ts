import { IsNumber, IsOptional, IsArray } from 'class-validator';

export class MarkAttendanceDto {
  @IsNumber()
  userId: number;
}

export class MarkMultipleAttendanceDto {
  @IsArray()
  @IsNumber({}, { each: true })
  userIds: number[];
}

export class RemoveAttendanceDto {
  @IsNumber()
  userId: number;
}
