import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TeamIdentityService {
  private readonly logger = new Logger(TeamIdentityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create a team identity for a given team name
   */
  async getOrCreateTeamIdentity(teamName: string): Promise<any> {
    try {
      // Normalize the team name (remove common variations)
      const normalizedName = this.normalizeTeamName(teamName);
      
      // Try to find existing team identity
      let teamIdentity = await this.prisma.teamIdentity.findUnique({
        where: { canonicalName: normalizedName },
        include: {
          scrapedTeams: {
            include: {
              teams: true
            }
          },
          appTeam: true
        }
      });

      // If not found, create a new one
      if (!teamIdentity) {
        teamIdentity = await this.prisma.teamIdentity.create({
          data: {
            canonicalName: normalizedName,
            displayName: teamName,
            isActive: true
          },
          include: {
            scrapedTeams: {
              include: {
                teams: true
              }
            },
            appTeam: true
          }
        });
        
        this.logger.log(`Created new team identity: ${normalizedName}`);
      }

      return teamIdentity;
    } catch (error) {
      this.logger.error(`Failed to get or create team identity for ${teamName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Normalize team name to handle variations
   */
  private normalizeTeamName(teamName: string): string {
    return teamName
      .toLowerCase()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/fc\s*$/i, ' fc') // Standardize FC suffix
      .replace(/football\s*club/i, 'fc') // Standardize Football Club
      .trim();
  }

  /**
   * Link a scraped team to a team identity
   */
  async linkScrapedTeamToIdentity(scrapedTeamId: number, teamIdentityId: number): Promise<void> {
    try {
      await this.prisma.scrapedTeam.update({
        where: { id: scrapedTeamId },
        data: { teamIdentityId }
      });
      
      this.logger.log(`Linked scraped team ${scrapedTeamId} to team identity ${teamIdentityId}`);
    } catch (error) {
      this.logger.error(`Failed to link scraped team ${scrapedTeamId} to team identity ${teamIdentityId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all team identities with their scraped teams grouped by season
   */
  async getTeamIdentitiesWithHistory(): Promise<any[]> {
    try {
      const teamIdentities = await this.prisma.teamIdentity.findMany({
        where: { isActive: true },
        include: {
          scrapedTeams: {
            orderBy: { seasonId: 'desc' }
          },
          appTeam: true
        },
        orderBy: { displayName: 'asc' }
      });

      return teamIdentities.map(identity => ({
        ...identity,
        currentSeason: identity.scrapedTeams[0] || null,
        history: identity.scrapedTeams.slice(1) || []
      }));
    } catch (error) {
      this.logger.error(`Failed to get team identities with history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get current season teams only (for team mapping interface)
   */
  async getCurrentSeasonTeams(): Promise<any[]> {
    try {
      // Get the most recent season ID
      const latestSeason = await this.prisma.scrapedTeam.findFirst({
        orderBy: { seasonId: 'desc' },
        select: { seasonId: true }
      });

      if (!latestSeason) {
        return [];
      }

      const currentSeasonTeams = await this.prisma.scrapedTeam.findMany({
        where: { 
          seasonId: latestSeason.seasonId,
          isActive: true,
          NOT: {
            teamName: { startsWith: 'Division' }
          }
        },
        include: {
          teamIdentity: true,
          teams: {
            select: {
              id: true,
              name: true,
              division: true,
            }
          }
        },
        orderBy: [
          { division: 'asc' },
          { teamName: 'asc' }
        ]
      });

      return currentSeasonTeams;
    } catch (error) {
      this.logger.error(`Failed to get current season teams: ${error.message}`);
      throw error;
    }
  }

  /**
   * Auto-link existing scraped teams to team identities
   */
  async autoLinkExistingTeams(): Promise<{ linked: number; errors: number }> {
    try {
      const scrapedTeams = await this.prisma.scrapedTeam.findMany({
        where: { teamIdentityId: null },
        orderBy: { teamName: 'asc' }
      });

      let linked = 0;
      let errors = 0;

      for (const scrapedTeam of scrapedTeams) {
        try {
          const teamIdentity = await this.getOrCreateTeamIdentity(scrapedTeam.teamName);
          await this.linkScrapedTeamToIdentity(scrapedTeam.id, teamIdentity.id);
          linked++;
        } catch (error) {
          this.logger.error(`Failed to auto-link team ${scrapedTeam.teamName}: ${error.message}`);
          errors++;
        }
      }

      this.logger.log(`Auto-linked ${linked} teams, ${errors} errors`);
      return { linked, errors };
    } catch (error) {
      this.logger.error(`Failed to auto-link existing teams: ${error.message}`);
      throw error;
    }
  }
}
