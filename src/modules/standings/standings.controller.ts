import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StandingsService } from './standings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('standings')
@UseGuards(JwtAuthGuard)
export class StandingsController {
  constructor(private readonly standingsService: StandingsService) {}

  @Get()
  async getLeagueTable(
    @Query('division') division?: string,
    @Query('seasonId') seasonId?: string,
    @Query('divisionId') divisionId?: string
  ) {
    const standings = await this.standingsService.getLeagueTable(division, seasonId, divisionId);
    const lastUpdated = await this.standingsService.getLastUpdated();
    
    return {
      standings,
      lastUpdated,
      division: division || 'All Divisions',
      seasonId: seasonId || 'Current Season'
    };
  }

  @Get('divisions')
  async getDivisions() {
    return await this.standingsService.getDivisions();
  }

  @Get('team')
  async getTeamStanding(
    @Query('teamName') teamName: string,
    @Query('division') division: string,
    @Query('seasonId') seasonId?: string
  ) {
    return await this.standingsService.getTeamStanding(teamName, division, seasonId);
  }
}
