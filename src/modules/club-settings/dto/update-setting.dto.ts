import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateSettingDto {
  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
