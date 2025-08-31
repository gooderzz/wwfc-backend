import { IsEnum, IsOptional, IsNumber } from 'class-validator';
import { RSVPStatus } from '@prisma/client';

export class CreateRSVPDto {
  @IsEnum(RSVPStatus)
  status: RSVPStatus;

  @IsOptional()
  @IsNumber()
  userId?: number; // For managers/admins creating RSVPs for other users
}

export class UpdateRSVPDto {
  @IsEnum(RSVPStatus)
  status: RSVPStatus;
}
