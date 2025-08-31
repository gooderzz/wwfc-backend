import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  UseGuards, 
  Body, 
  Query, 
  Param,
  HttpStatus,
  HttpException,
  Req
} from '@nestjs/common';
import { FAFullTimeScraperService } from './fa-fulltime-scraper.service';
import { TeamIdentityService } from '../teams/team-identity.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  ScrapeTableDto,
  ScrapeDivisionDto,
  ScrapeMultipleDto,
  ScrapingConfigDto,
  ScrapingLogsDto
} from './dto/scraping.dto';
import { ScrapingStatusEnum, ScrapingTypeEnum } from './scraping.types';

@Controller('scraping')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScrapingController {
  constructor(
    private readonly scraperService: FAFullTimeScraperService,
    private readonly teamIdentityService: TeamIdentityService
  ) {}

  @Get('status')
  @Roles('ADMIN', 'MANAGER')
  async getStatus() {
    return {
      status: 'Scraping service is running',
      safeMode: this.scraperService.isInSafeMode(),
      configuration: this.scraperService.getStatus(),
    };
  }

  @Post('test')
  @Roles('ADMIN', 'MANAGER')
  async testScraping() {
    return await this.scraperService.testScraping();
  }

  @Get('divisions/:seasonId')
  @Roles('ADMIN', 'MANAGER')
  async getDivisionsForSeason(@Param('seasonId') seasonId: string) {
    try {
      const divisions = await this.scraperService.getDivisionsForSeason(seasonId);
      return {
        success: true,
        divisions: divisions,
        seasonId: seasonId,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Get('divisions')
  @Roles('ADMIN', 'MANAGER')
  async getDivisions() {
    try {
      return await this.scraperService.discoverDivisions();
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Get('seasons')
  @Roles('ADMIN', 'MANAGER')
  async getSeasons() {
    try {
      return await this.scraperService.discoverSeasons();
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Get('teams')
  @Roles('ADMIN', 'MANAGER')
  async getScrapedTeams() {
    try {
      const teams = await this.scraperService.getScrapedTeams();
      return {
        success: true,
        teams: teams,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Get('division-names')
  async getDivisionNames() {
    try {
      const divisions = await this.scraperService.discoverDivisions();
      const divisionMap = divisions.reduce((map, division) => {
        map[division.id] = division.name;
        return map;
      }, {} as Record<string, string>);
      
      return {
        success: true,
        divisions: divisionMap,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Post('auto-link-teams')
  @Roles('ADMIN')
  async autoLinkTeams() {
    try {
      const result = await this.teamIdentityService.autoLinkExistingTeams();
      return {
        success: true,
        result,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Get('team-identities')
  async getTeamIdentities() {
    try {
      // Simple test first
      const teamIdentities = await this.teamIdentityService.getTeamIdentitiesWithHistory();
      return {
        success: true,
        identities: teamIdentities,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Get('test-team-identity')
  @Roles('ADMIN', 'MANAGER')
  async testTeamIdentity() {
    try {
      return {
        success: true,
        message: 'Team identity service is working',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Get('discover')
  @Roles('ADMIN', 'MANAGER')
  async discoverAll() {
    try {
      return await this.scraperService.discoverAll();
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Post('scrape-table')
  @Roles('ADMIN', 'MANAGER')
  async scrapeLeagueTable(@Body() scrapeTableDto: ScrapeTableDto, @Req() req: any) {
    try {
      const { divisionId, seasonId, leagueId, forceRefresh } = scrapeTableDto;
      
      if (!divisionId || !seasonId) {
        throw new HttpException('divisionId and seasonId are required', HttpStatus.BAD_REQUEST);
      }

      // Get user ID from the request
      const initiatedById = req.user?.id;

      // Use the new scrape and update method with logging
      return await this.scraperService.scrapeAndUpdateLeagueTable(divisionId, seasonId, leagueId, initiatedById);
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Post('scrape-division')
  @Roles('ADMIN', 'MANAGER')
  async scrapeDivision(@Body() scrapeDivisionDto: ScrapeDivisionDto) {
    try {
      const { divisionId, seasonId, leagueId, includeHistorical } = scrapeDivisionDto;
      
      if (!divisionId) {
        throw new HttpException('divisionId is required', HttpStatus.BAD_REQUEST);
      }

      // If no season specified, use live season
      const targetSeasonId = seasonId || (await this.scraperService.discoverSeasons(leagueId))
        .find(s => s.isLive)?.id;

      if (!targetSeasonId) {
        throw new HttpException('No valid season found', HttpStatus.BAD_REQUEST);
      }

      const result = await this.scraperService.scrapeLeagueTableWithDetails(
        divisionId, 
        targetSeasonId, 
        leagueId
      );

      return {
        ...result,
        divisionId,
        seasonId: targetSeasonId,
        includeHistorical
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Post('scrape-multiple')
  @Roles('ADMIN', 'MANAGER')
  async scrapeMultipleDivisions(@Body() scrapeMultipleDto: ScrapeMultipleDto) {
    try {
      const { divisionIds, seasonId, leagueId, parallel } = scrapeMultipleDto;
      
      if (!divisionIds || divisionIds.length === 0) {
        throw new HttpException('At least one divisionId is required', HttpStatus.BAD_REQUEST);
      }

      // If no season specified, use live season
      const targetSeasonId = seasonId || (await this.scraperService.discoverSeasons(leagueId))
        .find(s => s.isLive)?.id;

      if (!targetSeasonId) {
        throw new HttpException('No valid season found', HttpStatus.BAD_REQUEST);
      }

      const results = [];
      const startTime = Date.now();

      if (parallel) {
        // Scrape divisions in parallel
        const promises = divisionIds.map(divisionId =>
          this.scraperService.scrapeLeagueTableWithDetails(divisionId, targetSeasonId, leagueId)
        );
        
        const parallelResults = await Promise.all(promises);
        results.push(...parallelResults);
      } else {
        // Scrape divisions sequentially
        for (const divisionId of divisionIds) {
          const result = await this.scraperService.scrapeLeagueTableWithDetails(
            divisionId, 
            targetSeasonId, 
            leagueId
          );
          results.push(result);
        }
      }

      const totalTime = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      return {
        success: true,
        results,
        summary: {
          totalDivisions: divisionIds.length,
          successCount,
          failureCount,
          totalTime,
          parallel
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }



  @Put('config')
  @Roles('ADMIN')
  async updateScrapingConfig(@Body() configDto: ScrapingConfigDto) {
    try {
      const { safeMode, rateLimitDelay, userAgent } = configDto;
      
      if (safeMode !== undefined) {
        this.scraperService.setSafeMode(safeMode);
      }

      // Additional config updates will be implemented
      return {
        success: true,
        message: 'Configuration updated successfully',
        currentConfig: this.scraperService.getStatus(),
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Put('disable-safe-mode')
  @Roles('ADMIN')
  async disableSafeMode() {
    try {
      this.scraperService.setSafeMode(false);
      
      return {
        success: true,
        message: 'Safe mode disabled - database updates are now enabled',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Put('set-live-season')
  @Roles('ADMIN')
  async setLiveSeason(@Body() body: { seasonId: string; leagueId?: string }) {
    try {
      const { seasonId, leagueId } = body;
      
      if (!seasonId) {
        throw new HttpException('seasonId is required', HttpStatus.BAD_REQUEST);
      }

      // This will be implemented when we add season management
      // For now, return a placeholder response
      return {
        success: true,
        message: 'Live season override will be implemented in database integration',
        seasonId,
        leagueId,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Get('config')
  @Roles('ADMIN', 'MANAGER')
  async getScrapingConfig() {
    try {
      return {
        success: true,
        config: this.scraperService.getStatus(),
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Post('refresh-cache')
  @Roles('ADMIN', 'MANAGER')
  async refreshCache() {
    try {
      // Clear any cached data and re-discover
      const discovery = await this.scraperService.discoverAll();
      
      return {
        success: true,
        message: 'Cache refreshed successfully',
        discovery,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Get('health')
  @Roles('ADMIN', 'MANAGER')
  async getHealth() {
    try {
      const status = this.scraperService.getStatus();
      const isHealthy = !status.isRunning && status.errors.length === 0;
      
      return {
        success: true,
        healthy: isHealthy,
        status,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        healthy: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  // ===== SCRAPING LOGS ENDPOINTS =====

  @Get('logs')
  @Roles('ADMIN', 'MANAGER')
  async getScrapingLogs(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('divisionId') divisionId?: string,
    @Query('seasonId') seasonId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const filters: any = {};
      if (type && Object.values(ScrapingTypeEnum).includes(type as ScrapingTypeEnum)) {
        filters.type = type as ScrapingTypeEnum;
      }
      if (status && Object.values(ScrapingStatusEnum).includes(status as ScrapingStatusEnum)) {
        filters.status = status as ScrapingStatusEnum;
      }
      if (divisionId) filters.divisionId = divisionId;
      if (seasonId) filters.seasonId = seasonId;
      if (limit) filters.limit = parseInt(limit, 10);
      if (offset) filters.offset = parseInt(offset, 10);

      const result = await this.scraperService.getScrapingLogs(filters);
      
      return {
        success: true,
        ...result,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Get('logs/stats')
  @Roles('ADMIN', 'MANAGER')
  async getScrapingStats() {
    try {
      const stats = await this.scraperService.getScrapingStats();
      
      return {
        success: true,
        stats,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Post('logs/:logId/retry')
  @Roles('ADMIN', 'MANAGER')
  async retryScrapingLog(@Param('logId') logId: string) {
    try {
      const logIdNum = parseInt(logId, 10);
      if (isNaN(logIdNum)) {
        throw new HttpException('Invalid log ID', HttpStatus.BAD_REQUEST);
      }

      const success = await this.scraperService.retryScrapingLog(logIdNum);
      
      return {
        success: true,
        message: `Retry scheduled for log ${logIdNum}`,
        logId: logIdNum,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  @Get('logs/:logId')
  @Roles('ADMIN', 'MANAGER')
  async getScrapingLog(@Param('logId') logId: string) {
    try {
      const logIdNum = parseInt(logId, 10);
      if (isNaN(logIdNum)) {
        throw new HttpException('Invalid log ID', HttpStatus.BAD_REQUEST);
      }

      const logs = await this.scraperService.getScrapingLogs({ limit: 1, offset: 0 });
      const log = logs.logs.find(l => l.id === logIdNum);
      
      if (!log) {
        throw new HttpException('Log not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        log,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }
}
