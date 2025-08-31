import { IsEnum, IsOptional, IsNumber } from 'class-validator';
import { RSVPStatus } from '@prisma/client';

export class RSVPDto {
  @IsEnum(RSVPStatus)
  status: RSVPStatus;
}

export class CreateRSVPForUserDto {
  @IsEnum(RSVPStatus)
  status: RSVPStatus;

  @IsOptional()
  @IsNumber()
  userId?: number;
}
