import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { SettingsResponseDto, SettingsByCategoryDto } from './dto/settings-response.dto';

@Injectable()
export class ClubSettingsService {
  constructor(private prisma: PrismaService) {}

  async getAllSettings(): Promise<SettingsResponseDto[]> {
    return this.prisma.clubSettings.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { key: 'asc' }
      ]
    });
  }

  async getSettingsByCategory(category: string): Promise<SettingsResponseDto[]> {
    return this.prisma.clubSettings.findMany({
      where: { 
        category,
        isActive: true 
      },
      orderBy: { key: 'asc' }
    });
  }

  async getSettingsByCategoryGrouped(): Promise<SettingsByCategoryDto> {
    const settings = await this.getAllSettings();
    console.log('All settings from database:', settings);
    
    const grouped: SettingsByCategoryDto = {};
    
    if (Array.isArray(settings)) {
      settings.forEach(setting => {
        if (!grouped[setting.category]) {
          grouped[setting.category] = {};
        }
        grouped[setting.category][setting.key] = setting;
      });
    }
    
    console.log('Grouped settings:', grouped);
    return grouped;
  }

  async getSetting(category: string, key: string): Promise<SettingsResponseDto | null> {
    return this.prisma.clubSettings.findUnique({
      where: {
        category_key: {
          category,
          key
        }
      }
    });
  }

  async updateSetting(
    category: string, 
    key: string, 
    updateSettingDto: UpdateSettingDto
  ): Promise<SettingsResponseDto> {
    return this.prisma.clubSettings.upsert({
      where: {
        category_key: {
          category,
          key
        }
      },
      update: {
        value: updateSettingDto.value,
        description: updateSettingDto.description,
        isActive: updateSettingDto.isActive ?? true,
        updatedAt: new Date()
      },
      create: {
        category,
        key,
        value: updateSettingDto.value,
        description: updateSettingDto.description,
        isActive: updateSettingDto.isActive ?? true
      }
    });
  }

  async updateMultipleSettings(updates: Array<{
    category: string;
    key: string;
    value: string;
    description?: string;
  }>): Promise<SettingsResponseDto[]> {
    const results = await Promise.all(
      updates.map(update => 
        this.updateSetting(update.category, update.key, {
          value: update.value,
          description: update.description
        })
      )
    );
    
    return results;
  }

  async deleteSetting(category: string, key: string): Promise<void> {
    await this.prisma.clubSettings.update({
      where: {
        category_key: {
          category,
          key
        }
      },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });
  }

  // Logo management methods
  async getAllLogos() {
    return this.prisma.clubLogo.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async getActiveLogo() {
    return this.prisma.clubLogo.findFirst({
      where: { isActive: true }
    });
  }

  async createLogo(uploadLogoDto: any) {
    // Deactivate all existing logos first
    await this.prisma.clubLogo.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    // Create new logo as active
    return this.prisma.clubLogo.create({
      data: {
        ...uploadLogoDto,
        isActive: true
      }
    });
  }

  async activateLogo(id: string) {
    // Deactivate all existing logos
    await this.prisma.clubLogo.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    // Activate the specified logo
    return this.prisma.clubLogo.update({
      where: { id },
      data: { isActive: true }
    });
  }

  async deleteLogo(id: string) {
    return this.prisma.clubLogo.delete({
      where: { id }
    });
  }
}
