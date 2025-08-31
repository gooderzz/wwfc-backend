import { IsString, IsEnum, IsDecimal, IsDateString, IsOptional, IsInt, Min } from 'class-validator';
import { PaymentType, PaymentStatus, PaymentMethod } from '@prisma/client';

export class CreatePaymentRecordDto {
  @IsInt()
  userId: number;

  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @IsDecimal({ decimal_digits: '0,2' })
  amount: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  discountAmount?: string;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsInt()
  fixtureId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  matchMinutes?: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePaymentRecordDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsDateString()
  paidDate?: string;

  @IsOptional()
  @IsString()
  squarePaymentId?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsInt()
  markedBy?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  paidAmount?: string;
}

export class MarkPaymentPaidDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  squarePaymentId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class PaymentRecordResponseDto {
  id: string;
  userId: number;
  paymentType: PaymentType;
  amount: number;
  discountAmount: number;
  finalAmount: number;
  paidAmount: number;
  status: PaymentStatus;
  dueDate: Date;
  paidDate: Date | null;
  eventId: string | null;
  matchMinutes: number | null;
  paymentMethod: PaymentMethod;
  squarePaymentId: string | null;
  markedBy: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  event?: {
    id: string;
    title: string;
    eventType: string;
  } | null;
  markedByUser?: {
    id: number;
    name: string;
    email: string;
  } | null;
}
