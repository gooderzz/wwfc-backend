import { Controller, Get, UseGuards, Delete, Param, ParseIntPipe, Post, Body, Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import { FixturesService } from '../fixtures/fixtures.service';
import { TeamsService } from '../teams/teams.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateFixtureDto } from '../fixtures/dto/create-fixture.dto';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly fixturesService: FixturesService,
    private readonly teamsService: TeamsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('users')
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('users')
  async createUser(@Body() body: { name: string; email: string; password: string; role: string; teamId?: number }) {
    return this.usersService.createUser(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('users/:id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; email?: string; role?: string; teamId?: number }
  ) {
    return this.usersService.updateUser(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('users/:id')
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteUser(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('teams')
  async getAllTeams() {
    return this.teamsService.getAllTeams();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('teams')
  async createTeam(@Body() body: { name: string; division: string; slug: string; homeAddress?: string }) {
    return this.teamsService.createTeam(body.name, body.division, body.slug, body.homeAddress);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('teams/:id')
  async updateTeam(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; division?: string; slug?: string; homeAddress?: string }
  ) {
    return this.teamsService.updateTeam(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('teams/:id')
  async deleteTeam(@Param('id', ParseIntPipe) id: number) {
    return this.teamsService.deleteTeam(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('fixtures')
  async getAllFixtures() {
    return this.fixturesService.getAllFixtures();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('fixtures')
  async createFixture(@Body() createFixtureDto: CreateFixtureDto) {
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
    return this.fixturesService.createFixture(
      teamId,
      fixtureType,
      opponent,
      new Date(date),
      new Date(kickOffTime),
      null, // Admin can create fixtures for any team
      location,
      address,
      cupName,
      seasonId,
    );
  }
} 