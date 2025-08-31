import { 
  Controller, 
  Get, 
  Patch, 
  Post, 
  Delete, 
  Param, 
  Body, 
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ClubSettingsService } from './club-settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { SettingsResponseDto, SettingsByCategoryDto } from './dto/settings-response.dto';

@Controller('club-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ClubSettingsController {
  constructor(private readonly clubSettingsService: ClubSettingsService) {}

  @Get()
  async getAllSettings(): Promise<SettingsResponseDto[]> {
    return this.clubSettingsService.getAllSettings();
  }

  @Get('grouped')
  async getSettingsByCategoryGrouped(): Promise<SettingsByCategoryDto> {
    console.log('GET /club-settings/grouped called');
    const result = await this.clubSettingsService.getSettingsByCategoryGrouped();
    console.log('Controller returning:', result);
    return result;
  }

  @Get(':category')
  async getSettingsByCategory(@Param('category') category: string): Promise<SettingsResponseDto[]> {
    return this.clubSettingsService.getSettingsByCategory(category);
  }

  @Get(':category/:key')
  async getSetting(
    @Param('category') category: string,
    @Param('key') key: string
  ): Promise<SettingsResponseDto | null> {
    return this.clubSettingsService.getSetting(category, key);
  }

  @Patch(':category/:key')
  async updateSetting(
    @Param('category') category: string,
    @Param('key') key: string,
    @Body() updateSettingDto: UpdateSettingDto
  ): Promise<SettingsResponseDto> {
    return this.clubSettingsService.updateSetting(category, key, updateSettingDto);
  }

  @Post('bulk')
  async updateMultipleSettings(
    @Body() updates: Array<{
      category: string;
      key: string;
      value: string;
      description?: string;
    }>
  ): Promise<SettingsResponseDto[]> {
    return this.clubSettingsService.updateMultipleSettings(updates);
  }

  @Delete(':category/:key')
  async deleteSetting(
    @Param('category') category: string,
    @Param('key') key: string
  ): Promise<void> {
    return this.clubSettingsService.deleteSetting(category, key);
  }

  // Logo management endpoints
  @Get('logo/all')
  async getAllLogos() {
    return this.clubSettingsService.getAllLogos();
  }

  @Get('logo/active')
  async getActiveLogo() {
    return this.clubSettingsService.getActiveLogo();
  }

  @Post('logo/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|gif)' }),
        ],
      }),
    )
    file: any,
  ) {
    const uploadLogoDto = {
      filename: file.filename || `${Date.now()}-${file.originalname}`,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };

    return this.clubSettingsService.createLogo(uploadLogoDto);
  }

  @Patch('logo/:id/activate')
  async activateLogo(@Param('id') id: string) {
    return this.clubSettingsService.activateLogo(id);
  }

  @Delete('logo/:id')
  async deleteLogo(@Param('id') id: string) {
    return this.clubSettingsService.deleteLogo(id);
  }
}
