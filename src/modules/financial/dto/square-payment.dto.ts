import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class CreateSquarePaymentDto {
  @IsString()
  sourceId: string;

  @IsString()
  paymentRecordId: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string = 'GBP';

  @IsOptional()
  @IsString()
  note?: string;
}

export class SquarePaymentResponseDto {
  id: string;
  status: string;
  amountMoney: {
    amount: number;
    currency: string;
  };
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export class SquareWebhookEventDto {
  @IsString()
  type: string;

  @IsString()
  merchantId: string;

  @IsString()
  eventId: string;

  @IsString()
  createdAt: string;

  data: {
    type: string;
    id: string;
    object: {
      payment: {
        id: string;
        status: string;
        amountMoney: {
          amount: number;
          currency: string;
        };
        receiptUrl?: string;
        createdAt: string;
        updatedAt: string;
      };
    };
  };
}

export class SquarePaymentStatusDto {
  id: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELED';
  amountMoney: {
    amount: number;
    currency: string;
  };
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}
