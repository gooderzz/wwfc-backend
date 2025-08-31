export class SettingsResponseDto {
  id: string;
  category: string;
  key: string;
  value: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class SettingsByCategoryDto {
  [category: string]: {
    [key: string]: SettingsResponseDto;
  };
}
