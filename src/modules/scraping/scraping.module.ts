import { Module } from '@nestjs/common';
import { FAFullTimeScraperService } from './fa-fulltime-scraper.service';
import { ScrapingController } from './scraping.controller';
import { PrismaService } from '../../prisma.service';
import { TeamIdentityService } from '../teams/team-identity.service';

@Module({
  controllers: [ScrapingController],
  providers: [FAFullTimeScraperService, TeamIdentityService, PrismaService],
  exports: [FAFullTimeScraperService],
})
export class ScrapingModule {}
