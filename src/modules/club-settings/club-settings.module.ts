import { Module } from '@nestjs/common';
import { ClubSettingsController } from './club-settings.controller';
import { ClubSettingsService } from './club-settings.service';
import { PrismaService } from '../../prisma.service';

@Module({
  imports: [],
  controllers: [ClubSettingsController],
  providers: [ClubSettingsService, PrismaService],
  exports: [ClubSettingsService],
})
export class ClubSettingsModule {}
