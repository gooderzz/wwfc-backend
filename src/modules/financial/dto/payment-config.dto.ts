import { IsString, IsEnum, IsDecimal, IsBoolean, IsOptional } from 'class-validator';
import { PaymentType } from '@prisma/client';

export class CreatePaymentConfigDto {
  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @IsDecimal({ decimal_digits: '0,2' })
  amount: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePaymentConfigDto {
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  amount?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PaymentConfigResponseDto {
  id: string;
  paymentType: PaymentType;
  amount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
