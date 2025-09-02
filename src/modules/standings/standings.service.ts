import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export interface LeagueTableEntry {
  id: number;
  teamName: string;
  division: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string[];
  lastUpdated: Date;
  seasonId?: string;
  teamIdentityId?: number;
}

@Injectable()
export class StandingsService {
  constructor(private prisma: PrismaService) {}

  async getLeagueTable(division?: string, seasonId?: string, divisionId?: string): Promise<LeagueTableEntry[]> {
    const where: any = {};
    
    if (division) {
      where.division = division;
    }
    
    if (seasonId) {
      where.seasonId = seasonId;
    }
    
    if (divisionId) {
      // If divisionId is provided, we need to join with ScrapedTeam to filter by divisionId
      // For now, we'll use the division field as a fallback
      // TODO: Implement proper divisionId filtering when needed
    }
    
    const standings = await this.prisma.leagueTable.findMany({
      where,
      orderBy: [
        { points: 'desc' },
        { goalDifference: 'desc' },
        { goalsFor: 'desc' }
      ],
      include: {
        scrapedTeam: {
          include: {
            teamIdentity: true
          }
        }
      }
    });

    return standings.map(standing => ({
      ...standing,
      form: JSON.parse(standing.form),
      teamIdentityId: standing.scrapedTeam?.teamIdentity?.id
    }));
  }

  async getTeamStanding(teamName: string, division: string, seasonId?: string): Promise<LeagueTableEntry | null> {
    const where: any = {
      teamName,
      division
    };
    
    if (seasonId) {
      where.seasonId = seasonId;
    }

    const standing = await this.prisma.leagueTable.findFirst({
      where,
      include: {
        scrapedTeam: {
          include: {
            teamIdentity: true
          }
        }
      }
    });

    if (!standing) return null;

    return {
      ...standing,
      form: JSON.parse(standing.form),
      teamIdentityId: standing.scrapedTeam?.teamIdentity?.id
    };
  }

  async updateLeagueTable(entries: Omit<LeagueTableEntry, 'id' | 'lastUpdated'>[], seasonId: string): Promise<void> {
    // Update entries sequentially for better pooler compatibility
    for (const entry of entries) {
      await this.prisma.leagueTable.upsert({
        where: {
          teamName_division_seasonId: {
            teamName: entry.teamName,
            division: entry.division,
            seasonId: seasonId
          }
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
          form: JSON.stringify(entry.form),
          lastUpdated: new Date()
        },
        create: {
          teamName: entry.teamName,
          division: entry.division,
          seasonId: seasonId,
          position: entry.position,
          played: entry.played,
          won: entry.won,
          drawn: entry.drawn,
          lost: entry.lost,
          goalsFor: entry.goalsFor,
          goalsAgainst: entry.goalsAgainst,
          goalDifference: entry.goalDifference,
          points: entry.points,
          form: JSON.stringify(entry.form)
        }
      });
    }
  }

  async getDivisions(): Promise<string[]> {
    const divisions = await this.prisma.leagueTable.findMany({
      select: { division: true },
      distinct: ['division']
    });
    
    return divisions.map(d => d.division);
  }

  async getLastUpdated(): Promise<Date | null> {
    const latest = await this.prisma.leagueTable.findFirst({
      orderBy: { lastUpdated: 'desc' },
      select: { lastUpdated: true }
    });
    
    return latest?.lastUpdated || null;
  }
}
