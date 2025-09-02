import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { PrismaService } from '../../prisma.service';
import { TeamIdentityService } from '../teams/team-identity.service';
import { 
  Division, 
  Season, 
  LeagueTableEntry, 
  ScrapingResult, 
  DiscoveryResult,
  ScrapingStatus,
  ScrapingStatusEnum,
  ScrapingTypeEnum,
  ScrapingLogEntry
} from './scraping.types';
import { IBrowserService, BrowserServiceFactory } from './browser-services';

@Injectable()
export class FAFullTimeScraperService {
  private readonly logger = new Logger(FAFullTimeScraperService.name);
  private readonly baseUrl = 'https://fulltime.thefa.com';
  private readonly defaultLeagueId = '3545957'; // Southern Sunday Football League
  private isSafeMode = true; // Safe testing mode - no DB writes
  private browserService: IBrowserService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly teamIdentityService: TeamIdentityService
  ) {
    // Initialize browser service based on environment
    this.browserService = BrowserServiceFactory.create();
  }

  /**
   * Initialize browser instance
   */
  private async getBrowser() {
    try {
      this.logger.log('Getting browser instance...');
      return await this.browserService.launch();
    } catch (error) {
      this.logger.error(`Failed to initialize browser: ${error.message}`);
      throw new Error(`Browser initialization failed: ${error.message}`);
    }
  }

  /**
   * Close browser instance
   */
  async closeBrowser(): Promise<void> {
    try {
      await this.browserService.close();
      this.logger.log('Browser closed');
    } catch (error) {
      this.logger.warn(`Error closing browser: ${error.message}`);
    }
  }

  /**
   * Set safe mode (read-only, no DB writes)
   */
  setSafeMode(enabled: boolean): void {
    this.isSafeMode = enabled;
    this.logger.log(`Safe mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get current safe mode status
   */
  isInSafeMode(): boolean {
    return this.isSafeMode;
  }

  /**
   * Cleanup method to close browser when service is destroyed
   */
  async onModuleDestroy(): Promise<void> {
    await this.closeBrowser();
  }

  /**
   * Get divisions for a specific season
   */
  async getDivisionsForSeason(seasonId: string): Promise<Division[]> {
    try {
      this.logger.log(`Getting divisions for season: ${seasonId}`);
      
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Navigate to the table page with the specific season
      const url = `${this.baseUrl}/table.html?selectedSeason=${seasonId}&activeTab=1`;
      this.logger.debug(`Navigating to: ${url}`);
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for the division dropdown to load
      await page.waitForSelector('select[name="selectedDivision"]', { timeout: 10000 });
      
      // Rate limiting delay
      await this.delay(2000 + Math.random() * 1000);
      
      // Extract division options for this specific season
      const divisions = await page.evaluate(() => {
        const options = Array.from(document.querySelectorAll('select[name="selectedDivision"] option'));
        return options
          .map(option => ({
            id: option.getAttribute('value'),
            name: option.textContent?.trim()
          }))
          .filter(option => option.id && option.name && option.id !== '0')
          .map(option => ({
            id: option.id!,
            name: option.name!,
            leagueId: '3545957', // Southern Sunday Football League
            isActive: true,
            lastScraped: new Date()
          }));
      });

      await page.close();

      // Sort divisions by name for consistency
      divisions.sort((a, b) => a.name.localeCompare(b.name));

      this.logger.log(`Found ${divisions.length} divisions for season ${seasonId}`);
      return divisions;
    } catch (error) {
      this.logger.error(`Failed to get divisions for season ${seasonId}: ${error.message}`);
      throw new Error(`Failed to get divisions for season: ${error.message}`);
    }
  }

  /**
   * Discover available divisions for a league
   */
  async discoverDivisions(leagueId: string = this.defaultLeagueId): Promise<Division[]> {
    try {
      this.logger.log(`Discovering divisions for league: ${leagueId}`);
      
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Navigate to the table page with correct URL structure
      const url = `${this.baseUrl}/table.html?selectedSeason=965423047&activeTab=1`;
      this.logger.debug(`Navigating to: ${url}`);
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for the division dropdown to load
      await page.waitForSelector('select[name="selectedDivision"]', { timeout: 10000 });
      
      // Rate limiting delay
      await this.delay(2000 + Math.random() * 1000);
      
      // Extract division options
      const divisions = await page.evaluate(() => {
        const options = Array.from(document.querySelectorAll('select[name="selectedDivision"] option'));
        return options
          .map(option => ({
            id: option.getAttribute('value'),
            name: option.textContent?.trim()
          }))
          .filter(option => option.id && option.name && option.id !== '0')
          .map(option => ({
            id: option.id!,
            name: option.name!,
            leagueId: '3545957', // Southern Sunday Football League
            isActive: true,
            lastScraped: new Date()
          }));
      });

      await page.close();

      // Sort divisions by name for consistency
      divisions.sort((a, b) => a.name.localeCompare(b.name));

      this.logger.log(`Found ${divisions.length} valid divisions`);
      return divisions;
    } catch (error) {
      this.logger.error(`Failed to discover divisions: ${error.message}`);
      throw new Error(`Division discovery failed: ${error.message}`);
    }
  }

  /**
   * Discover available seasons for a league
   */
  async discoverSeasons(leagueId: string = this.defaultLeagueId): Promise<Season[]> {
    try {
      this.logger.log(`Discovering seasons for league: ${leagueId}`);
      
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Navigate to the table page with correct URL structure
      const url = `${this.baseUrl}/table.html?selectedSeason=965423047&activeTab=1`;
      this.logger.debug(`Navigating to: ${url}`);
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for the season dropdown to load
      await page.waitForSelector('select[name="selectedSeason"]', { timeout: 10000 });
      
      // Rate limiting delay
      await this.delay(2000 + Math.random() * 1000);
      
      // Extract season options
      const seasons = await page.evaluate(() => {
        const options = Array.from(document.querySelectorAll('select[name="selectedSeason"] option'));
        return options
          .map(option => ({
            id: option.getAttribute('value'),
            name: option.textContent?.trim()
          }))
          .filter(option => option.id && option.name && option.id !== '0')
          .map(option => ({
            id: option.id!,
            name: option.name!,
            leagueId: '3545957' // Southern Sunday Football League
          }));
      });

      await page.close();

      // Process seasons with our existing logic
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1; // 1-12
      
      const processedSeasons: Season[] = seasons.map(season => {
        const seasonYear = this.extractSeasonYear(season.name);
        const seasonDates = this.calculateSeasonDates(seasonYear);
        
        // Determine if this is the live season (only one should be live)
        const isLive = this.isLiveSeason(seasonYear, currentYear, currentMonth);
        
        return {
          id: season.id,
          name: season.name,
          isLive: isLive,
          leagueId: season.leagueId,
          year: seasonYear,
          isAdminOverride: false,
          startDate: seasonDates.startDate,
          endDate: seasonDates.endDate,
        };
      });

      // Sort seasons by year (newest first)
      processedSeasons.sort((a, b) => b.year - a.year);

      // Ensure only one season is marked as live (the most recent one that should be live)
      let foundLiveSeason = false;
      for (const season of processedSeasons) {
        if (season.isLive && !foundLiveSeason) {
          foundLiveSeason = true;
        } else if (season.isLive && foundLiveSeason) {
          // Mark subsequent seasons as not live
          season.isLive = false;
          this.logger.debug(`Marked season ${season.name} as not live (conflict resolution)`);
        }
      }

      this.logger.log(`Found ${processedSeasons.length} seasons`);
      this.logger.log(`Live season: ${processedSeasons.find(s => s.isLive)?.name || 'None'}`);
      
      return processedSeasons;
    } catch (error) {
      this.logger.error(`Failed to discover seasons: ${error.message}`);
      throw new Error(`Season discovery failed: ${error.message}`);
    }
  }

  /**
   * Scrape league table for a specific division and season
   */
  async scrapeLeagueTable(
    divisionId: string, 
    seasonId: string, 
    leagueId: string = this.defaultLeagueId
  ): Promise<LeagueTableEntry[]> {
    try {
      this.logger.log(`Scraping league table for division: ${divisionId}, season: ${seasonId}`);
      
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Use the correct URL structure we discovered
      const url = `${this.baseUrl}/table.html?selectedSeason=${seasonId}&selectedDivision=${divisionId}&activeTab=1`;
      this.logger.log(`Navigating to: ${url}`);
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for the league table to load
      await page.waitForSelector('table', { timeout: 15000 });
      
      // Rate limiting delay
      await this.delay(2000 + Math.random() * 1000);
      
      // Extract table data using Puppeteer
      const tableData = await page.evaluate(() => {
        const tables = Array.from(document.querySelectorAll('table'));
        let targetTable = null;
        
        // Find the main league table (first table with position column)
        for (const table of tables) {
          const headers = Array.from(table.querySelectorAll('th'));
          const hasPositionHeader = headers.some(th => 
            th.textContent?.includes('POS') || th.textContent?.includes('Position')
          );
          
          if (hasPositionHeader) {
            targetTable = table;
            break;
          }
        }
        
        if (!targetTable) {
          return { error: 'No league table found' };
        }
        
        const rows = Array.from(targetTable.querySelectorAll('tr'));
        const entries = [];
        let parseErrors = 0;
        let skippedRows = 0;
        
        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll('td'));
          
          // Skip header rows and rows with insufficient data
          if (row.querySelector('th') || cells.length < 9) {
            skippedRows++;
            continue;
          }
          
          try {
            // Extract position
            const positionText = cells[0]?.textContent?.trim();
            const position = parseInt(positionText || '0');
            
            if (!position || position <= 0) {
              parseErrors++;
              continue;
            }
            
            // Extract team name
            const teamName = cells[1]?.textContent?.trim();
            if (!teamName || teamName.length < 2) {
              parseErrors++;
              continue;
            }
            
            // Extract numeric fields
            const played = parseInt(cells[2]?.textContent?.trim() || '0') || 0;
            const won = parseInt(cells[3]?.textContent?.trim() || '0') || 0;
            const drawn = parseInt(cells[4]?.textContent?.trim() || '0') || 0;
            const lost = parseInt(cells[5]?.textContent?.trim() || '0') || 0;
            const goalsFor = parseInt(cells[6]?.textContent?.trim() || '0') || 0;
            const goalsAgainst = parseInt(cells[7]?.textContent?.trim() || '0') || 0;
            const goalDifference = parseInt(cells[8]?.textContent?.trim() || '0') || 0;
            const points = parseInt(cells[9]?.textContent?.trim() || '0') || 0;
            
            // Basic validation
            if (played !== (won + drawn + lost)) {
              parseErrors++;
              continue;
            }
            
            entries.push({
              position,
              teamName,
              played,
              won,
              drawn,
              lost,
              goalsFor,
              goalsAgainst,
              goalDifference,
              points
            });
            
          } catch (error) {
            parseErrors++;
            continue;
          }
        }
        
        return {
          entries,
          parseErrors,
          skippedRows,
          totalRows: rows.length
        };
      });
      
      await page.close();
      
      if (tableData.error) {
        throw new Error(tableData.error);
      }
      
      if (!tableData.entries) {
        throw new Error('No table data returned from page evaluation');
      }
      
      this.logger.debug(`Found ${tableData.entries.length} valid entries`);
      this.logger.debug(`Parse errors: ${tableData.parseErrors}, Skipped rows: ${tableData.skippedRows}`);
      
      // Sort entries by position
      tableData.entries.sort((a, b) => a.position - b.position);
      
      // Validate we have a reasonable number of teams
      if (tableData.entries.length === 0) {
        throw new Error('No valid teams found in league table');
      }

      if (tableData.entries.length < 3) {
        this.logger.warn(`Very few teams found (${tableData.entries.length}), this might indicate a parsing issue`);
      }

      this.logger.log(`Scraping completed: ${tableData.entries.length} teams, ${tableData.parseErrors} errors, ${tableData.skippedRows} rows skipped`);
      
      return tableData.entries;
    } catch (error) {
      this.logger.error(`Failed to scrape league table: ${error.message}`);
      throw new Error(`League table scraping failed: ${error.message}`);
    }
  }

  /**
   * Update league table in database with scraped data
   */
  async updateLeagueTable(
    divisionId: string,
    seasonId: string,
    leagueTableData: LeagueTableEntry[],
    leagueId: string = this.defaultLeagueId
  ): Promise<{
    success: boolean;
    teamsCreated: number;
    teamsUpdated: number;
    teamsSkipped: number;
    errors: string[];
    processingTime: number;
  }> {
    const startTime = Date.now();
    const errors: string[] = [];
    let teamsCreated = 0;
    let teamsUpdated = 0;
    let teamsSkipped = 0;

    try {
      this.logger.log(`Updating league table for division: ${divisionId}, season: ${seasonId}`);
      
      if (this.isSafeMode) {
        this.logger.warn('Safe mode enabled - skipping database updates');
        return {
          success: true,
          teamsCreated: 0,
          teamsUpdated: 0,
          teamsSkipped: leagueTableData.length,
          errors: ['Safe mode enabled - no database updates performed'],
          processingTime: Date.now() - startTime,
        };
      }

      // Use transaction for rollback on failure
      const result = await this.prisma.$transaction(async (tx) => {
        const division = await this.getOrCreateDivision(tx, divisionId, leagueId);
        const season = await this.getOrCreateSeason(tx, seasonId, leagueId);
        
        const updateResults = {
          teamsCreated: 0,
          teamsUpdated: 0,
          teamsSkipped: 0,
          errors: [] as string[],
        };

        // Process each team in the league table
        for (const entry of leagueTableData) {
          try {
            const teamResult = await this.processTeamEntry(tx, entry, division, season);
            
            if (teamResult.created) {
              updateResults.teamsCreated++;
            } else if (teamResult.updated) {
              updateResults.teamsUpdated++;
            } else {
              updateResults.teamsSkipped++;
            }
          } catch (error) {
            const errorMsg = `Failed to process team ${entry.teamName}: ${error.message}`;
            this.logger.error(errorMsg);
            updateResults.errors.push(errorMsg);
          }
        }

        return updateResults;
      });

      const processingTime = Date.now() - startTime;
      
      this.logger.log(`League table update completed in ${processingTime}ms`);
      this.logger.log(`Teams created: ${result.teamsCreated}, updated: ${result.teamsUpdated}, skipped: ${result.teamsSkipped}`);
      
      if (result.errors.length > 0) {
        this.logger.warn(`Encountered ${result.errors.length} errors during update`);
      }

      return {
        success: true,
        teamsCreated: result.teamsCreated,
        teamsUpdated: result.teamsUpdated,
        teamsSkipped: result.teamsSkipped,
        errors: result.errors,
        processingTime,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMsg = `Failed to update league table: ${error.message}`;
      this.logger.error(errorMsg);
      
      return {
        success: false,
        teamsCreated: 0,
        teamsUpdated: 0,
        teamsSkipped: 0,
        errors: [errorMsg],
        processingTime,
      };
    }
  }

  /**
   * Get or create division record
   */
  private async getOrCreateDivision(tx: any, divisionId: string, leagueId: string) {
    // Return a division object with the division ID and name
    // The division name will be populated later when we have division discovery
    const divisionName = `Division ${divisionId}`;
    
    return {
      division: divisionName,
      divisionId: divisionId,
      leagueId: leagueId,
    };
  }

  /**
   * Get or create season record (placeholder for now)
   */
  private async getOrCreateSeason(tx: any, seasonId: string, leagueId: string) {
    // This is a placeholder - in a full implementation, we'd have a Season model
    // For now, we'll return the seasonId as a string
    return { id: seasonId, leagueId };
  }

  /**
   * Process a single team entry from the league table
   */
  private async processTeamEntry(tx: any, entry: LeagueTableEntry, division: any, season: any) {
    const result = { created: false, updated: false };

    try {
      this.logger.debug(`Processing team: ${entry.teamName}`);
      
      // Get or create team identity
      const teamIdentity = await this.teamIdentityService.getOrCreateTeamIdentity(entry.teamName);
      
      // First, try to find or create the scraped team
      const scrapedTeam = await tx.scrapedTeam.upsert({
        where: {
          teamIdentityId_seasonId: {
            teamIdentityId: teamIdentity.id,
            seasonId: season.id,
          },
        },
        update: {
          teamName: entry.teamName,
          division: division.division,
          leagueId: division.leagueId,
          divisionId: division.divisionId,
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          teamName: entry.teamName,
          division: division.division,
          leagueId: division.leagueId,
          divisionId: division.divisionId,
          seasonId: season.id,
          teamIdentityId: teamIdentity.id,
          isActive: true,
        },
      });

      this.logger.debug(`Scraped team processed: ${scrapedTeam.id} with team identity: ${teamIdentity.id}`);

      // Auto-map to existing team if possible
      try {
        const existingTeam = await this.findExistingTeam(entry.teamName);
        if (existingTeam && !existingTeam.teamIdentityId) {
          await tx.team.update({
            where: { id: existingTeam.id },
            data: { teamIdentityId: teamIdentity.id },
          });
          this.logger.debug(`Auto-mapped team ${entry.teamName} to existing team ${existingTeam.name} via team identity`);
        }
      } catch (mappingError) {
        this.logger.warn(`Failed to auto-map team ${entry.teamName}: ${mappingError.message}`);
        // Continue processing even if mapping fails
      }

      // Update or create league table entry
      const leagueTableEntry = await tx.leagueTable.upsert({
        where: {
          teamName_division_seasonId: {
            teamName: entry.teamName,
            division: division.division,
            seasonId: season.id,
          },
        },
        update: {
          position: entry.position,
          played: entry.played,
          won: entry.won,
          drawn: entry.drawn,
          lost: entry.lost,
          goalsFor: entry.goalsFor,
          goalsAgainst: entry.goalsAgainst,
          goalDifference: entry.goalDifference,
          points: entry.points,
          form: '[]', // Empty form for now - will be populated later
          scrapedAt: new Date(),
          scrapedTeamId: scrapedTeam.id,
        },
        create: {
          teamName: entry.teamName,
          division: division.division,
          seasonId: season.id,
          position: entry.position,
          played: entry.played,
          won: entry.won,
          drawn: entry.drawn,
          lost: entry.lost,
          goalsFor: entry.goalsFor,
          goalsAgainst: entry.goalsAgainst,
          goalDifference: entry.goalDifference,
          points: entry.points,
          form: '[]', // Empty form for now - will be populated later
          scrapedAt: new Date(),
          scrapedTeamId: scrapedTeam.id,
        },
      });

      this.logger.debug(`League table entry processed: ${leagueTableEntry.id}`);
      
      // For now, assume it was created
      result.created = true;

    } catch (error) {
      this.logger.error(`Error processing team entry ${entry.teamName}: ${error.message}`);
      throw error;
    }

    return result;
  }

  /**
   * Find existing team by name (fuzzy matching)
   */
  private async findExistingTeam(teamName: string) {
    try {
      // Simple fuzzy matching - in production, you might want more sophisticated matching
      const teams = await this.prisma.team.findMany({
        where: {
          OR: [
            { name: { contains: teamName, mode: 'insensitive' } },
            { name: { contains: teamName.split(' ')[0], mode: 'insensitive' } }, // First word match
          ],
        },
      });

      if (teams.length === 1) {
        return teams[0];
      } else if (teams.length > 1) {
        // If multiple matches, try to find the best match
        const normalizedName = teamName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const bestMatch = teams.find(team => {
          const normalizedTeamName = team.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          return normalizedTeamName === normalizedName;
        });
        return bestMatch || null;
      }

      return null;
    } catch (error) {
      this.logger.warn(`Error finding existing team for ${teamName}: ${error.message}`);
      return null;
    }
  }

  /**
   * Create a new scraping log entry
   */
  async createScrapingLog(
    type: ScrapingTypeEnum,
    divisionId?: string,
    seasonId?: string,
    leagueId: string = this.defaultLeagueId,
    initiatedById?: number
  ): Promise<number> {
    try {
      const log = await this.prisma.scrapingLog.create({
        data: {
          type,
          status: ScrapingStatusEnum.PENDING,
          divisionId,
          seasonId,
          leagueId,
          initiatedById,
          startedAt: new Date(),
        },
      });
      
      this.logger.log(`Created scraping log entry: ${log.id} for type: ${type}`);
      return log.id;
    } catch (error) {
      this.logger.error(`Failed to create scraping log: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update scraping log status and results
   */
  async updateScrapingLog(
    logId: number,
    updates: {
      status: ScrapingStatusEnum;
      completedAt?: Date;
      processingTime?: number;
      teamsFound?: number;
      teamsCreated?: number;
      teamsUpdated?: number;
      teamsSkipped?: number;
      errors?: string[];
      warnings?: string[];
      metadata?: string;
    }
  ): Promise<void> {
    try {
      await this.prisma.scrapingLog.update({
        where: { id: logId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });
      
      this.logger.debug(`Updated scraping log ${logId} with status: ${updates.status}`);
    } catch (error) {
      this.logger.error(`Failed to update scraping log ${logId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get scraping logs with filtering and pagination
   */
  async getScrapingLogs(
    filters: {
      type?: ScrapingTypeEnum;
      status?: ScrapingStatusEnum;
      divisionId?: string;
      seasonId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    logs: ScrapingLogEntry[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const { type, status, divisionId, seasonId, limit = 50, offset = 0 } = filters;
      
      const where: any = {};
      if (type) where.type = type;
      if (status) where.status = status;
      if (divisionId) where.divisionId = divisionId;
      if (seasonId) where.seasonId = seasonId;

      const [logs, total] = await Promise.all([
        this.prisma.scrapingLog.findMany({
          where,
          include: {
            initiatedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { startedAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.prisma.scrapingLog.count({ where }),
      ]);

      return {
        logs: logs as ScrapingLogEntry[],
        total,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      this.logger.error(`Failed to get scraping logs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retry a failed scraping operation
   */
  async retryScrapingLog(logId: number): Promise<boolean> {
    try {
      const log = await this.prisma.scrapingLog.findUnique({
        where: { id: logId },
      });

      if (!log) {
        throw new Error(`Scraping log ${logId} not found`);
      }

      if (log.status !== ScrapingStatusEnum.FAILED && log.status !== ScrapingStatusEnum.PARTIAL_SUCCESS) {
        throw new Error(`Cannot retry log ${logId} with status ${log.status}`);
      }

      if (log.retryCount >= log.maxRetries) {
        throw new Error(`Maximum retries (${log.maxRetries}) exceeded for log ${logId}`);
      }

      // Update retry information
      await this.prisma.scrapingLog.update({
        where: { id: logId },
        data: {
          status: ScrapingStatusEnum.RETRY_PENDING,
          retryCount: { increment: 1 },
          lastRetryAt: new Date(),
          nextRetryAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
        },
      });

      this.logger.log(`Scheduled retry for scraping log ${logId} (attempt ${log.retryCount + 1}/${log.maxRetries})`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to retry scraping log ${logId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get scraping statistics
   */
  async getScrapingStats(): Promise<{
    totalLogs: number;
    successfulLogs: number;
    failedLogs: number;
    partialSuccessLogs: number;
    averageProcessingTime: number;
    lastSuccessfulScrape?: Date;
    lastFailedScrape?: Date;
  }> {
    try {
      const [
        totalLogs,
        successfulLogs,
        failedLogs,
        partialSuccessLogs,
        avgProcessingTime,
        lastSuccessful,
        lastFailed,
      ] = await Promise.all([
        this.prisma.scrapingLog.count(),
        this.prisma.scrapingLog.count({ where: { status: ScrapingStatusEnum.SUCCESS } }),
        this.prisma.scrapingLog.count({ where: { status: ScrapingStatusEnum.FAILED } }),
        this.prisma.scrapingLog.count({ where: { status: ScrapingStatusEnum.PARTIAL_SUCCESS } }),
        this.prisma.scrapingLog.aggregate({
          where: { processingTime: { not: null } },
          _avg: { processingTime: true },
        }),
        this.prisma.scrapingLog.findFirst({
          where: { status: ScrapingStatusEnum.SUCCESS },
          orderBy: { completedAt: 'desc' },
          select: { completedAt: true },
        }),
        this.prisma.scrapingLog.findFirst({
          where: { status: ScrapingStatusEnum.FAILED },
          orderBy: { completedAt: 'desc' },
          select: { completedAt: true },
        }),
      ]);

      return {
        totalLogs,
        successfulLogs,
        failedLogs,
        partialSuccessLogs,
        averageProcessingTime: avgProcessingTime._avg.processingTime || 0,
        lastSuccessfulScrape: lastSuccessful?.completedAt || undefined,
        lastFailedScrape: lastFailed?.completedAt || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get scraping stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Scrape and update league table in database with logging
   */
  async scrapeAndUpdateLeagueTable(
    divisionId: string,
    seasonId: string,
    leagueId: string = this.defaultLeagueId,
    initiatedById?: number
  ): Promise<{
    success: boolean;
    scrapedData?: LeagueTableEntry[];
    databaseResult?: {
      teamsCreated: number;
      teamsUpdated: number;
      teamsSkipped: number;
      errors: string[];
      processingTime: number;
    };
    error?: string;
    timestamp: Date;
    logId?: number;
  }> {
    const startTime = Date.now();
    let logId: number | undefined;

    try {
      this.logger.log(`Starting scrape and update for division: ${divisionId}, season: ${seasonId}`);
      
      // Create scraping log entry
      logId = await this.createScrapingLog(
        ScrapingTypeEnum.LEAGUE_TABLE,
        divisionId,
        seasonId,
        leagueId,
        initiatedById
      );

      // Update status to in progress
      await this.updateScrapingLog(logId, {
        status: ScrapingStatusEnum.IN_PROGRESS,
      });

      // First, scrape the league table
      const scrapedData = await this.scrapeLeagueTable(divisionId, seasonId, leagueId);
      
      // Then, update the database
      const databaseResult = await this.updateLeagueTable(divisionId, seasonId, scrapedData, leagueId);
      
      const processingTime = Date.now() - startTime;
      const totalTeams = scrapedData.length;
      const hasErrors = databaseResult.errors.length > 0;
      const hasWarnings = false; // Could be enhanced to track warnings

      // Determine final status
      let finalStatus = ScrapingStatusEnum.SUCCESS;
      let warnings = hasWarnings ? ['Some warnings occurred'] : [];
      
      // Check if this was a safe mode operation
      const isSafeModeOperation = databaseResult.errors.some(error => 
        error.includes('Safe mode enabled')
      );
      
      if (isSafeModeOperation) {
        // Safe mode operations should be marked as SUCCESS with a warning
        finalStatus = ScrapingStatusEnum.SUCCESS;
        warnings = ['Operation completed in safe mode - no database updates performed'];
        // Remove the safe mode error from the errors array since it's not a real error
        databaseResult.errors = databaseResult.errors.filter(error => 
          !error.includes('Safe mode enabled')
        );
      } else if (hasErrors && databaseResult.teamsCreated + databaseResult.teamsUpdated === 0) {
        finalStatus = ScrapingStatusEnum.FAILED;
      } else if (hasErrors) {
        finalStatus = ScrapingStatusEnum.PARTIAL_SUCCESS;
      }

      // Update log with results
      await this.updateScrapingLog(logId, {
        status: finalStatus,
        completedAt: new Date(),
        processingTime,
        teamsFound: totalTeams,
        teamsCreated: databaseResult.teamsCreated,
        teamsUpdated: databaseResult.teamsUpdated,
        teamsSkipped: databaseResult.teamsSkipped,
        errors: databaseResult.errors,
        warnings: warnings,
        metadata: JSON.stringify({
          divisionId,
          seasonId,
          leagueId,
          scrapedDataCount: scrapedData.length,
        }),
      });

      this.logger.log(`Scrape and update completed for log ${logId} with status: ${finalStatus}`);
      
      return {
        success: true,
        scrapedData,
        databaseResult,
        timestamp: new Date(),
        logId,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error.message;
      
      this.logger.error(`Scrape and update failed: ${errorMessage}`);

      // Update log with failure if we have a log ID
      if (logId) {
        await this.updateScrapingLog(logId, {
          status: ScrapingStatusEnum.FAILED,
          completedAt: new Date(),
          processingTime,
          errors: [errorMessage],
        });
      }

      return {
        success: false,
        error: errorMessage,
        timestamp: new Date(),
        logId,
      };
    }
  }

  /**
   * Test scraping functionality (safe mode)
   */
  async testScraping(): Promise<ScrapingResult> {
    try {
      this.logger.log('Starting scraping test in safe mode');
      
      const startTime = Date.now();
      
      // Use the comprehensive discovery method
      const discovery = await this.discoverAll();
      
      if (!discovery.success) {
        return {
          success: false,
          error: discovery.error || 'Discovery failed',
          timestamp: new Date(),
        };
      }

      if (discovery.divisions.length === 0) {
        return {
          success: false,
          error: 'No divisions found',
          timestamp: new Date(),
        };
      }

      if (discovery.seasons.length === 0) {
        return {
          success: false,
          error: 'No seasons found',
          timestamp: new Date(),
        };
      }

      // Test league table scraping with first division and current season (or first season)
      const firstDivision = discovery.divisions[0];
      const targetSeason = discovery.currentSeason || discovery.seasons[0];
      
      const leagueTable = await this.scrapeLeagueTable(
        firstDivision.id, 
        targetSeason.id
      );

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          discovery: discovery,
          sampleLeagueTable: leagueTable,
          safeMode: this.isSafeMode,
        },
        timestamp: new Date(),
        divisionId: firstDivision.id,
        seasonId: targetSeason.id,
        teamsFound: leagueTable.length,
        processingTime: processingTime,
      };
    } catch (error) {
      this.logger.error(`Scraping test failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Extract year from season name (e.g., "2025-26" -> 2025)
   */
  private extractSeasonYear(seasonName: string): number {
    const match = seasonName.match(/(\d{4})/);
    return match ? parseInt(match[1]) : new Date().getFullYear();
  }

  /**
   * Calculate season start and end dates
   */
  private calculateSeasonDates(seasonYear: number): { startDate: Date; endDate: Date } {
    // Season typically runs from August to May
    const startDate = new Date(seasonYear, 7, 1); // August 1st
    const endDate = new Date(seasonYear + 1, 4, 31); // May 31st of next year
    return { startDate, endDate };
  }

  /**
   * Determine if a season is currently live
   */
  private isLiveSeason(seasonYear: number, currentYear: number, currentMonth: number): boolean {
    // Season is live if it's the current year or previous year (for ongoing season)
    if (seasonYear === currentYear) return true;
    if (seasonYear === currentYear - 1 && currentMonth >= 8) return true; // Previous year, but after August
    if (seasonYear === currentYear + 1 && currentMonth <= 5) return true; // Next year, but before June
    return false;
  }



  /**
   * Validate division name format
   */
  private isValidDivisionName(divisionName: string): boolean {
    // Basic validation - division name should not be empty and should contain reasonable characters
    if (!divisionName || divisionName.length < 3) return false;
    if (divisionName.length > 100) return false;
    
    // Check for common invalid patterns
    const invalidPatterns = [
      /^[0-9\s]+$/, // Only numbers and spaces
      /^[^\w\s\-&()]+$/, // No alphanumeric characters
    ];
    
    return !invalidPatterns.some(pattern => pattern.test(divisionName));
  }

  /**
   * Parse integer with validation
   */
  private parseInteger(value: string, fieldName: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    
    const parsed = parseInt(trimmed);
    if (isNaN(parsed)) {
      this.logger.warn(`Invalid integer for ${fieldName}: ${value}`);
      return null;
    }
    
    return parsed;
  }

  /**
   * Validate team name format
   */
  private isValidTeamName(teamName: string): boolean {
    if (!teamName || teamName.length < 2) return false;
    if (teamName.length > 100) return false;
    
    // Check for common invalid patterns
    const invalidPatterns = [
      /^[0-9\s]+$/, // Only numbers and spaces
      /^[^\w\s\-&()]+$/, // No alphanumeric characters
    ];
    
    return !invalidPatterns.some(pattern => pattern.test(teamName));
  }

  /**
   * Validate table entry data consistency
   */
  private validateTableEntry(entry: {
    position: number;
    teamName: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
  }): boolean {
    // Basic validation checks
    if (entry.position <= 0) return false;
    if (entry.played < 0) return false;
    if (entry.won < 0 || entry.drawn < 0 || entry.lost < 0) return false;
    if (entry.goalsFor < 0 || entry.goalsAgainst < 0) return false;
    if (entry.points < 0) return false;

    // Validate that played = won + drawn + lost
    if (entry.played !== (entry.won + entry.drawn + entry.lost)) {
      this.logger.warn(`Games played mismatch for ${entry.teamName}: ${entry.played} != ${entry.won} + ${entry.drawn} + ${entry.lost}`);
      return false;
    }

    // Validate goal difference calculation
    const calculatedGoalDifference = entry.goalsFor - entry.goalsAgainst;
    if (entry.goalDifference !== calculatedGoalDifference) {
      this.logger.warn(`Goal difference mismatch for ${entry.teamName}: ${entry.goalDifference} != ${entry.goalsFor} - ${entry.goalsAgainst}`);
      return false;
    }

    // Validate points calculation (3 for win, 1 for draw, 0 for loss)
    const calculatedPoints = (entry.won * 3) + (entry.drawn * 1);
    if (entry.points !== calculatedPoints) {
      this.logger.warn(`Points calculation mismatch for ${entry.teamName}: ${entry.points} != (${entry.won} * 3) + (${entry.drawn} * 1) = ${calculatedPoints}`);
      return false;
    }

    return true;
  }

  /**
   * Delay function for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Scrape league table with detailed results and validation
   */
  async scrapeLeagueTableWithDetails(
    divisionId: string, 
    seasonId: string, 
    leagueId: string = this.defaultLeagueId
  ): Promise<{
    success: boolean;
    data?: LeagueTableEntry[];
    error?: string;
    stats: {
      totalTeams: number;
      parseErrors: number;
      skippedRows: number;
      processingTime: number;
    };
  }> {
    const startTime = Date.now();
    
    try {
      const entries = await this.scrapeLeagueTable(divisionId, seasonId, leagueId);
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        data: entries,
        stats: {
          totalTeams: entries.length,
          parseErrors: 0, // Will be updated in future enhancement
          skippedRows: 0, // Will be updated in future enhancement
          processingTime: processingTime,
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error.message,
        stats: {
          totalTeams: 0,
          parseErrors: 0,
          skippedRows: 0,
          processingTime: processingTime,
        },
      };
    }
  }

  /**
   * Comprehensive discovery of divisions and seasons
   */
  async discoverAll(leagueId: string = this.defaultLeagueId): Promise<DiscoveryResult> {
    try {
      this.logger.log(`Starting comprehensive discovery for league: ${leagueId}`);
      
      const startTime = Date.now();
      
      // Discover divisions and seasons in parallel
      const [divisions, seasons] = await Promise.all([
        this.discoverDivisions(leagueId),
        this.discoverSeasons(leagueId)
      ]);

      const currentSeason = seasons.find(s => s.isLive);
      
      const result: DiscoveryResult = {
        divisions: divisions,
        seasons: seasons,
        currentSeason: currentSeason,
        lastUpdated: new Date(),
        success: true,
      };

      const processingTime = Date.now() - startTime;
      this.logger.log(`Discovery completed in ${processingTime}ms`);
      this.logger.log(`Found ${divisions.length} divisions and ${seasons.length} seasons`);
      
      return result;
    } catch (error) {
      this.logger.error(`Comprehensive discovery failed: ${error.message}`);
      return {
        divisions: [],
        seasons: [],
        lastUpdated: new Date(),
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get scraping status and configuration
   */
  getStatus(): ScrapingStatus {
    return {
      isRunning: false, // Will be implemented in future tasks
      safeMode: this.isSafeMode,
      totalDivisions: 0, // Will be populated when discovery is run
      totalSeasons: 0, // Will be populated when discovery is run
      errors: [],
    };
  }

  /**
   * Get all scraped teams with their mappings
   */
  async getScrapedTeams(): Promise<any[]> {
    try {
      // Get current season teams only
      const latestSeason = await this.prisma.scrapedTeam.findFirst({
        orderBy: { seasonId: 'desc' },
        select: { seasonId: true }
      });

      if (!latestSeason) {
        return [];
      }

      const teams = await this.prisma.scrapedTeam.findMany({
        where: { 
          seasonId: latestSeason.seasonId,
          isActive: true,
          // Filter out entries that are divisions (teamName starts with "Division")
          NOT: {
            teamName: { startsWith: 'Division' }
          }
        },
        include: {
          teams: {
            select: {
              id: true,
              name: true,
              division: true,
            }
          },
          teamIdentity: true
        },
        orderBy: [
          { division: 'asc' },
          { teamName: 'asc' }
        ]
      });

      // Try to get division names from discovered divisions, but don't fail if it doesn't work
      let divisionMap = new Map();
      try {
        const discoveredDivisions = await this.discoverDivisions();
        divisionMap = new Map(discoveredDivisions.map(d => [d.id, d.name]));
        this.logger.log(`Successfully loaded ${discoveredDivisions.length} division names`);
      } catch (discoveryError) {
        this.logger.warn(`Failed to discover divisions for name mapping: ${discoveryError.message}`);
      }

      // Enhance teams with division names
      const enhancedTeams = teams.map(team => {
        let divisionName = team.division;
        
        // If the division field contains "Division" followed by a number, try to get the real name
        if (team.division.startsWith('Division ') && team.divisionId) {
          const realName = divisionMap.get(team.divisionId);
          if (realName) {
            divisionName = realName;
          }
        }
        
        return {
          ...team,
          divisionName: divisionName
        };
      });

      return enhancedTeams;
    } catch (error) {
      this.logger.error(`Failed to get scraped teams: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get cached divisions from database
   */
  private async getCachedDivisions(): Promise<Division[]> {
    try {
      this.logger.log('Attempting to get cached divisions from database...');
      
      // Get the most recent division data from scraped teams
      const latestSeason = await this.prisma.scrapedTeam.findFirst({
        orderBy: { seasonId: 'desc' },
        select: { seasonId: true }
      });

      if (!latestSeason) {
        this.logger.warn('No cached division data found');
        return [];
      }

      // Get unique divisions from scraped teams
      const divisions = await this.prisma.scrapedTeam.findMany({
        where: { 
          seasonId: latestSeason.seasonId,
          isActive: true,
          teamName: { startsWith: 'Division' }
        },
        select: {
          divisionId: true,
          division: true,
          seasonId: true
        },
        distinct: ['divisionId']
      });

      const cachedDivisions: Division[] = divisions.map(div => ({
        id: div.divisionId,
        name: div.division,
        leagueId: this.defaultLeagueId,
        isActive: true
      }));

      this.logger.log(`Retrieved ${cachedDivisions.length} cached divisions`);
      return cachedDivisions;
    } catch (error) {
      this.logger.error(`Failed to get cached divisions: ${error.message}`);
      return [];
    }
  }

  /**
   * Get cached seasons from database
   */
  private async getCachedSeasons(): Promise<Season[]> {
    try {
      this.logger.log('Attempting to get cached seasons from database...');
      
      // Get unique seasons from scraped teams
      const seasons = await this.prisma.scrapedTeam.findMany({
        select: {
          seasonId: true
        },
        distinct: ['seasonId'],
        orderBy: { seasonId: 'desc' }
      });

      const cachedSeasons: Season[] = seasons.map(season => ({
        id: season.seasonId,
        name: `Season ${season.seasonId}`,
        year: new Date().getFullYear(),
        isLive: false, // Assume cached seasons are not live
        leagueId: this.defaultLeagueId
      }));

      this.logger.log(`Retrieved ${cachedSeasons.length} cached seasons`);
      return cachedSeasons;
    } catch (error) {
      this.logger.error(`Failed to get cached seasons: ${error.message}`);
      return [];
    }
  }

  /**
   * Enhanced discoverDivisions with fallback
   */
  async discoverDivisionsWithFallback(leagueId: string = this.defaultLeagueId): Promise<Division[]> {
    try {
      return await this.discoverDivisions(leagueId);
    } catch (error) {
      this.logger.warn(`Scraping divisions failed, returning cached data: ${error.message}`);
      return await this.getCachedDivisions();
    }
  }

  /**
   * Enhanced discoverSeasons with fallback
   */
  async discoverSeasonsWithFallback(leagueId: string = this.defaultLeagueId): Promise<Season[]> {
    try {
      return await this.discoverSeasons(leagueId);
    } catch (error) {
      this.logger.warn(`Scraping seasons failed, returning cached data: ${error.message}`);
      return await this.getCachedSeasons();
    }
  }

  /**
   * Enhanced discoverAll with fallback
   */
  async discoverAllWithFallback(leagueId: string = this.defaultLeagueId): Promise<DiscoveryResult> {
    try {
      return await this.discoverAll(leagueId);
    } catch (error) {
      this.logger.warn(`Comprehensive discovery failed, returning cached data: ${error.message}`);
      
      const [cachedDivisions, cachedSeasons] = await Promise.all([
        this.getCachedDivisions(),
        this.getCachedSeasons()
      ]);

      return {
        divisions: cachedDivisions,
        seasons: cachedSeasons,
        lastUpdated: new Date(),
        success: false,
        error: `Using cached data due to scraping failure: ${error.message}`,
      };
    }
  }
}
