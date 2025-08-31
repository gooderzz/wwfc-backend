import { IsString, IsDecimal, IsOptional } from 'class-validator';

export class UserBalanceResponseDto {
  id: string;
  userId: number;
  currentBalance: number;
  lastUpdated: Date;

  // Relations
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export class AdjustBalanceDto {
  @IsDecimal({ decimal_digits: '0,2' })
  amount: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UserBalanceHistoryResponseDto {
  id: string;
  userId: number;
  paymentType: string;
  amount: number;
  discountAmount: number;
  finalAmount: number;
  status: string;
  dueDate: Date;
  paidDate: Date | null;
  paymentMethod: string;
  createdAt: Date;

  // Relations
  event?: {
    id: string;
    title: string;
    eventType: string;
  } | null;
}
