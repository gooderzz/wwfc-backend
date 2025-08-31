import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UploadLogoDto {
  @IsString()
  filename: string;

  @IsString()
  originalName: string;

  @IsString()
  mimeType: string;

  @IsNumber()
  size: number;
}
