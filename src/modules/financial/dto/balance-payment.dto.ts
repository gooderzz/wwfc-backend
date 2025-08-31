import { IsString, IsDecimal, IsOptional, IsEnum } from 'class-validator';

export class CreateBalancePaymentDto {
  @IsString()
  sourceId: string;

  @IsDecimal({ decimal_digits: '0,2' })
  amount: string;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class BalanceSummaryResponseDto {
  userId: number;
  currentBalance: number;
  totalDue: number;
  canPayBalance: boolean;
  duePayments: Array<{
    id: string;
    paymentType: string;
    finalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    status: string;
    dueDate: Date;
  }>;
}

export class BalancePaymentResponseDto {
  squarePaymentId: string;
  totalPaid: number;
  debtPaid: number;
  creditAdded: number;
  newBalance: number;
  allocatedRecords: BalanceSummaryResponseDto | null;
}
