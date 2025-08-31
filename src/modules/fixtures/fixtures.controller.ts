import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { FixturesService } from './fixtures.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateFixtureDto } from './dto/create-fixture.dto';
import { RSVPDto } from './dto/rsvp.dto';
import { UpdateResultDto } from './dto/update-result.dto';
import { PlayerStatsDto } from './dto/player-stats.dto';
import { BonusVoteDto } from './dto/bonus-vote.dto';

@Controller('fixtures')
export class FixturesController {
  constructor(private readonly fixturesService: FixturesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getFixtures(@Req() req: any) {
    // If user has a team, return their team's fixtures
    if (req.user.teamId) {
      return this.fixturesService.getFixturesForTeam(req.user.teamId, req.user.userId);
    }
    // If no team assigned, return empty array
    return [];
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  @Post('create')
  async createFixture(
    @Body() createFixtureDto: CreateFixtureDto,
    @Req() req: any,
  ) {
    const { 
      teamId, 
      fixtureType,
      opponent, 
      date, 
      kickOffTime,
      location, 
      address,
      cupName,
      seasonId 
    } = createFixtureDto;

    // Combine date (YYYY-MM-DD) and time (HH:MM) into full Date objects
    const dateOnly = new Date(date);
    let ko: Date;
    try {
      // If kickOffTime is time-only, build an ISO string with the same date
      if (kickOffTime && /^\d{2}:\d{2}$/.test(kickOffTime)) {
        const [hh, mm] = kickOffTime.split(':').map(Number);
        ko = new Date(dateOnly);
        ko.setHours(hh, mm, 0, 0);
      } else {
        ko = new Date(kickOffTime);
      }
    } catch {
      ko = dateOnly; // fallback
    }

    return this.fixturesService.createFixture(
      teamId,
      fixtureType,
      opponent,
      dateOnly,
      ko,
      req.user,
      location,
      address,
      cupName,
      seasonId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('team/:teamId')
  async getFixturesForTeam(@Param('teamId', ParseIntPipe) teamId: number, @Req() req: any) {
    return this.fixturesService.getFixturesForTeam(teamId, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('teams/division/:divisionId')
  async getTeamsByDivision(@Param('divisionId') divisionId: string) {
    return this.fixturesService.getTeamsByDivision(divisionId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('teams/search')
  async searchTeams(@Query('query') query: string) {
    return this.fixturesService.searchTeams(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('team/:teamId/home-address')
  async getTeamHomeAddress(@Param('teamId', ParseIntPipe) teamId: number) {
    return this.fixturesService.getTeamHomeAddress(teamId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/rsvp')
  async createRSVP(
    @Param('id', ParseIntPipe) fixtureId: number,
    @Body() body: { status: 'YES' | 'NO' | 'MAYBE'; userId?: number },
    @Req() req: any
  ) {
    // If userId is provided and user is manager/admin, create RSVP for that user
    if (body.userId && (req.user.role === 'MANAGER' || req.user.role === 'ADMIN')) {
      return this.fixturesService.updatePlayerRSVP(fixtureId, body.userId, body.status, req.user);
    }
    // Otherwise, create RSVP for the current user
    return this.fixturesService.createRSVP(req.user.userId, fixtureId, body.status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  @Get(':id/rsvps')
  async getRSVPsForFixture(@Param('id', ParseIntPipe) fixtureId: number) {
    return this.fixturesService.getRSVPsForFixture(fixtureId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/rsvps')
  async getUserRSVPs(@Req() req: any) {
    return this.fixturesService.getUserRSVPs(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getFixtureById(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.fixturesService.getFixtureById(id, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  @Post(':id/team-selection')
  async saveTeamSelection(@Param('id', ParseIntPipe) fixtureId: number, @Body() body: { starting11: any; substitutes: number[] }, @Req() req: any) {
    return this.fixturesService.saveTeamSelection(fixtureId, body, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/team-selection')
  async getTeamSelection(@Param('id', ParseIntPipe) fixtureId: number, @Req() req: any) {
    return this.fixturesService.getTeamSelection(fixtureId, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  @Post(':id/actual-team-selection')
  async saveActualTeamSelection(@Param('id', ParseIntPipe) fixtureId: number, @Body() body: { starting11: any; substitutes: number[] }, @Req() req: any) {
    return this.fixturesService.saveActualTeamSelection(fixtureId, body, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/actual-team-selection')
  async getActualTeamSelection(@Param('id', ParseIntPipe) fixtureId: number, @Req() req: any) {
    return this.fixturesService.getActualTeamSelection(fixtureId, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  @Post(':id/rsvp/:userId')
  async updatePlayerRSVP(
    @Param('id', ParseIntPipe) fixtureId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: { status: 'YES' | 'NO' | 'MAYBE' },
    @Req() req: any
  ) {
    return this.fixturesService.updatePlayerRSVP(fixtureId, userId, body.status, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  @Patch(':id/result')
  async updateResult(
    @Param('id', ParseIntPipe) fixtureId: number,
    @Body() dto: UpdateResultDto,
    @Req() req: any,
  ) {
    return this.fixturesService.updateResult(fixtureId, req.user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  @Post(':id/stats')
  async submitPlayerStats(
    @Param('id', ParseIntPipe) fixtureId: number,
    @Body() stats: PlayerStatsDto[],
    @Req() req: any,
  ) {
    return this.fixturesService.submitPlayerStats(fixtureId, req.user, stats);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/bonus-vote')
  async submitBonusVote(
    @Param('id', ParseIntPipe) fixtureId: number,
    @Body() dto: BonusVoteDto,
    @Req() req: any,
  ) {
    return this.fixturesService.submitBonusVote(fixtureId, req.user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  @Post(':id/aggregate-bonus')
  async aggregateBonusVotes(@Param('id', ParseIntPipe) fixtureId: number) {
    return this.fixturesService.aggregateBonusVotes(fixtureId);
  }
}
