import { IsString, IsEnum, IsBoolean, IsDateString, IsOptional } from 'class-validator';
import { DiscountType } from '@prisma/client';

export class CreateDiscountEligibilityDto {
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDiscountEligibilityDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class DiscountEligibilityResponseDto {
  id: string;
  userId: number;
  discountType: DiscountType;
  isActive: boolean;
  startDate: Date;
  endDate: Date | null;
  verifiedBy: number;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  verifiedByUser: {
    id: number;
    name: string;
    email: string;
  };
}
