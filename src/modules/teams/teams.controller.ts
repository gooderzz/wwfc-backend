import { Controller, Get, Post, Body, UseGuards, Param, ParseIntPipe, Req, ForbiddenException, Put, Query } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllTeams() {
    return this.teamsService.getAllTeams();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  async createTeam(@Body() body: { name: string; division: string; slug: string }) {
    return this.teamsService.createTeam(body.name, body.division, body.slug);
  }

  // Division Management Endpoints for Phase 3.2 - These must come before :id route
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @Get('validate-divisions')
  async validateDivisionConsistency() {
    return this.teamsService.validateDivisionConsistency();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @Get('division-changes')
  async getAllDivisionChanges(@Query('seasonId') seasonId?: string) {
    return this.teamsService.getAllDivisionChanges(seasonId);
  }

  // Division Hierarchy Management Endpoints
  @UseGuards(JwtAuthGuard)
  @Get('division-hierarchy')
  async getDivisionHierarchies(@Query('seasonId') seasonId?: string) {
    return this.teamsService.getDivisionHierarchies(seasonId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('division-hierarchy')
  async createDivisionHierarchy(@Body() body: { 
    seasonId: string; 
    leagueId: string; 
    hierarchy: string[]; 
    divisionNames: Record<string, string> 
  }) {
    return this.teamsService.createDivisionHierarchy(body.seasonId, body.leagueId, body.hierarchy, body.divisionNames);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put('division-hierarchy/:id')
  async updateDivisionHierarchy(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { 
      hierarchy: string[]; 
      divisionNames: Record<string, string> 
    }
  ) {
    return this.teamsService.updateDivisionHierarchy(id, body.hierarchy, body.divisionNames);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('division-hierarchy/:id')
  async getDivisionHierarchy(@Param('id', ParseIntPipe) id: number) {
    return this.teamsService.getDivisionHierarchy(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @Get('available-seasons')
  async getAvailableSeasons() {
    return this.teamsService.getAvailableSeasons();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getTeamById(@Param('id', ParseIntPipe) id: number) {
    return this.teamsService.getTeamById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/users')
  async getTeamUsers(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    // Check if user is manager/admin or belongs to this team
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER' && req.user.teamId !== id) {
      throw new ForbiddenException('Access denied');
    }
    
    // If manager, ensure they can only access their own team
    if (req.user.role === 'MANAGER' && req.user.teamId !== id) {
      throw new ForbiddenException('Managers can only access their own team');
    }
    
    return this.teamsService.getTeamUsers(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/available-players/:fixtureId')
  async getAvailablePlayersForFixture(
    @Param('id', ParseIntPipe) teamId: number,
    @Param('fixtureId', ParseIntPipe) fixtureId: number,
    @Req() req: any
  ) {
    // Check if user is manager/admin or belongs to this team
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER' && req.user.teamId !== teamId) {
      throw new ForbiddenException('Access denied');
    }
    
    // If manager, ensure they can only access their own team
    if (req.user.role === 'MANAGER' && req.user.teamId !== teamId) {
      throw new ForbiddenException('Managers can only access their own team');
    }
    
    return this.teamsService.getAvailablePlayersForFixture(teamId, fixtureId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('map')
  async mapTeam(@Body() body: { scrapedTeamId: number; appTeamId: number }) {
    return this.teamsService.mapTeam(body.scrapedTeamId, body.appTeamId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('unmap')
  async unmapTeam(@Body() body: { scrapedTeamId: number }) {
    return this.teamsService.unmapTeam(body.scrapedTeamId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('bulk-action')
  async bulkAction(@Body() body: { action: string; mappings: any[] }) {
    return this.teamsService.bulkAction(body.action, body.mappings);
  }

  // Division Management Endpoints for Phase 3.2
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('update-divisions')
  async updateTeamDivisions() {
    return this.teamsService.updateTeamDivisions();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @Get('division-history/:teamId')
  async getDivisionHistory(@Param('teamId', ParseIntPipe) teamId: number) {
    return this.teamsService.getDivisionHistory(teamId);
  }
}
