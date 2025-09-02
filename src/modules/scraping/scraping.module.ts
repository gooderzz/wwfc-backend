import { Module } from '@nestjs/common';
import { FAFullTimeScraperService } from './fa-fulltime-scraper.service';
import { ScrapingController } from './scraping.controller';
import { PrismaService } from '../../prisma.service';
import { TeamIdentityService } from '../teams/team-identity.service';
import { LocalPuppeteerService, VercelPuppeteerService } from './browser-services';

@Module({
  controllers: [ScrapingController],
  providers: [
    FAFullTimeScraperService, 
    TeamIdentityService, 
    PrismaService,
    LocalPuppeteerService,
    VercelPuppeteerService
  ],
  exports: [FAFullTimeScraperService],
})
export class ScrapingModule {}
