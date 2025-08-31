import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  BadRequestException
} from '@nestjs/common';
import { FormationsService } from './formations.service';
import {
  FormationResponseDto,
  FormationStatsResponseDto,
  TeamSelectionWithFormationDto,
  FormationChangeDto,
  FormationTeamSelectionDto
} from './dto/formation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('formations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FormationsController {
  constructor(private readonly formationsService: FormationsService) {}

  @Get()
  async getAllFormations(): Promise<{ formations: FormationResponseDto[] }> {
    const formations = await this.formationsService.getAllFormations();
    return { formations };
  }

  @Get(':id')
  async getFormationById(@Param('id') id: string): Promise<{ formation: FormationResponseDto }> {
    const formation = await this.formationsService.getFormationById(id);
    return { formation };
  }

  @Post()
  @Roles(Role.ADMIN)
  async createFormation(@Body() createFormationDto: any): Promise<{ formation: FormationResponseDto }> {
    const formation = await this.formationsService.createFormation(createFormationDto);
    return { formation };
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  async updateFormation(
    @Param('id') id: string,
    @Body() updateFormationDto: any
  ): Promise<{ formation: FormationResponseDto }> {
    const formation = await this.formationsService.updateFormation(id, updateFormationDto);
    return { formation };
  }

  @Get('stats/:teamId')
  async getFormationStats(
    @Param('teamId', ParseIntPipe) teamId: number
  ): Promise<{ stats: FormationStatsResponseDto[] }> {
    const stats = await this.formationsService.getFormationStats(teamId);
    return { stats };
  }

  @Get('fixtures/:fixtureId/team-selection')
  async getTeamSelectionWithFormation(
    @Param('fixtureId', ParseIntPipe) fixtureId: number
  ): Promise<{ teamSelection: TeamSelectionWithFormationDto | null }> {
    const teamSelection = await this.formationsService.getTeamSelectionWithFormation(fixtureId);
    return { teamSelection };
  }

  @Post('fixtures/:fixtureId/team-selection')
  @Roles(Role.MANAGER, Role.ADMIN)
  async createOrUpdateTeamSelection(
    @Param('fixtureId', ParseIntPipe) fixtureId: number,
    @Body() teamSelectionData: FormationTeamSelectionDto,
    @Request() req: any
  ): Promise<{ teamSelection: TeamSelectionWithFormationDto }> {
    const teamSelection = await this.formationsService.createOrUpdateTeamSelection(
      fixtureId,
      teamSelectionData as any,
      req.user?.id
    );
    return { teamSelection };
  }

  @Put('fixtures/:fixtureId/formation')
  @Roles(Role.MANAGER, Role.ADMIN)
  async updateFormationForTeamSelection(
    @Param('fixtureId', ParseIntPipe) fixtureId: number,
    @Body() formationChangeDto: FormationChangeDto
  ): Promise<{ teamSelection: TeamSelectionWithFormationDto }> {
    const teamSelection = await this.formationsService.updateFormationForTeamSelection(
      fixtureId,
      formationChangeDto.formationId,
      formationChangeDto.resetTeamSelection
    );
    return { teamSelection };
  }

  @Post('teams/:teamId/calculate-stats')
  @Roles(Role.ADMIN)
  async calculateFormationStats(
    @Param('teamId', ParseIntPipe) teamId: number
  ): Promise<{ message: string }> {
    await this.formationsService.calculateFormationStats(teamId);
    return { message: 'Formation statistics calculated successfully' };
  }

  @Get(':formationId/position-mapping')
  async getFormationPositionMapping(
    @Param('formationId') formationId: string
  ): Promise<{ mapping: Record<string, number | null> }> {
    const mapping = await this.formationsService.getFormationPositionMapping(formationId);
    return { mapping };
  }

  @Get('fixtures/:fixtureId/formation-comparison')
  async getFormationComparison(
    @Param('fixtureId', ParseIntPipe) fixtureId: number
  ): Promise<{ plannedFormation: any, actualFormation: any }> {
    const comparison = await this.formationsService.getFormationComparison(fixtureId);
    return comparison;
  }

  @Get('fixtures/:fixtureId/formation-stats')
  async getFixtureFormationStats(
    @Param('fixtureId', ParseIntPipe) fixtureId: number
  ): Promise<{ stats: any }> {
    const stats = await this.formationsService.getFixtureFormationStats(fixtureId);
    return { stats };
  }
}
