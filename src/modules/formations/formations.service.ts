import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import {
  Formation,
  FormationStats,
  FormationStatsWithCalculated,
  TeamSelectionWithFormation,
  FormationPositionMapping,
  FormationTeamSelection
} from './interfaces/formation.interface';
import { CreateFormationDto, UpdateFormationDto } from './dto/formation.dto';

@Injectable()
export class FormationsService {
  constructor(private prisma: PrismaService) {}

  async getAllFormations(): Promise<Formation[]> {
    return this.prisma.formation.findMany({
      where: { isActive: true },
      include: {
        positions: {
          orderBy: { displayOrder: 'asc' }
        }
      }
    });
  }

  async getFormationById(id: string): Promise<Formation> {
    const formation = await this.prisma.formation.findUnique({
      where: { id },
      include: {
        positions: {
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    if (!formation) {
      throw new NotFoundException(`Formation with ID ${id} not found`);
    }

    return formation;
  }

  async createFormation(createFormationDto: CreateFormationDto): Promise<Formation> {
    const { positions, ...formationData } = createFormationDto;

    // Check if formation already exists
    const existingFormation = await this.prisma.formation.findUnique({
      where: { id: formationData.id }
    });

    if (existingFormation) {
      throw new BadRequestException(`Formation with ID ${formationData.id} already exists`);
    }

    // Create formation with positions sequentially for better pooler compatibility
    const formation = await this.prisma.formation.create({
      data: formationData
    });

    // Create positions with unique IDs
    for (const positionData of positions) {
      await this.prisma.formationPosition.create({
        data: {
          ...positionData,
          id: `${formation.id}_${positionData.id}`,
          formationId: formation.id
        }
      });
    }

    return this.getFormationById(formation.id);
  }

  async updateFormation(id: string, updateFormationDto: UpdateFormationDto): Promise<Formation> {
    const formation = await this.prisma.formation.findUnique({
      where: { id }
    });

    if (!formation) {
      throw new NotFoundException(`Formation with ID ${id} not found`);
    }

    return this.prisma.formation.update({
      where: { id },
      data: updateFormationDto,
      include: {
        positions: {
          orderBy: { displayOrder: 'asc' }
        }
      }
    });
  }

  async getFormationStats(teamId: number): Promise<FormationStatsWithCalculated[]> {
    const stats = await this.prisma.formationStats.findMany({
      where: { teamId },
      include: {
        formation: true
      }
    });

    return stats.map((stat: any) => ({
      formationId: stat.formationId,
      formationName: stat.formation.name,
      gamesPlayed: stat.gamesPlayed,
      wins: stat.wins,
      draws: stat.draws,
      losses: stat.losses,
      goalsScored: stat.goalsScored,
      goalsConceded: stat.goalsConceded,
      winRate: stat.gamesPlayed > 0 ? (stat.wins / stat.gamesPlayed) * 100 : 0,
      avgGoalsScored: stat.gamesPlayed > 0 ? stat.goalsScored / stat.gamesPlayed : 0,
      avgGoalsConceded: stat.gamesPlayed > 0 ? stat.goalsConceded / stat.gamesPlayed : 0
    }));
  }

  async getTeamSelectionWithFormation(fixtureId: number): Promise<TeamSelectionWithFormation | null> {
    const teamSelection = await this.prisma.teamSelection.findUnique({
      where: { fixtureId },
      include: {
        formation: {
          include: {
            positions: {
              orderBy: { displayOrder: 'asc' }
            }
          }
        }
      }
    });

    return teamSelection;
  }

  async createOrUpdateTeamSelection(
    fixtureId: number,
    teamSelectionData: FormationTeamSelection,
    createdBy?: number
  ): Promise<TeamSelectionWithFormation> {
    // Validate formation exists
    await this.getFormationById(teamSelectionData.formationId);

    // Validate that all position IDs exist in the formation
    const formation = await this.getFormationById(teamSelectionData.formationId);
    const validPositionIds = formation.positions.map(p => p.id);
    
    const invalidPositions = Object.keys(teamSelectionData.starting11 || {}).filter(
      posId => !validPositionIds.includes(posId)
    );

    if (invalidPositions.length > 0) {
      throw new BadRequestException(`Invalid position IDs: ${invalidPositions.join(', ')}`);
    }

    // Check if team selection already exists
    const existingSelection = await this.prisma.teamSelection.findUnique({
      where: { fixtureId }
    });

    if (existingSelection) {
      // Update existing selection
      const updated = await this.prisma.teamSelection.update({
        where: { fixtureId },
        data: {
          formationId: teamSelectionData.formationId,
          starting11: teamSelectionData.starting11 || {},
          substitutes: teamSelectionData.substitutes || [],
          version: teamSelectionData.version || 1
        },
        include: {
          formation: {
            include: {
              positions: {
                orderBy: { displayOrder: 'asc' }
              }
            }
          }
        }
      });

      return updated;
    } else {
      // Create new selection
      const created = await this.prisma.teamSelection.create({
        data: {
          fixtureId,
          formationId: teamSelectionData.formationId,
          starting11: teamSelectionData.starting11 || {},
          substitutes: teamSelectionData.substitutes || [],
          version: teamSelectionData.version || 1,
          createdBy: createdBy || 1 // Default to user ID 1 if not provided
        },
        include: {
          formation: {
            include: {
              positions: {
                orderBy: { displayOrder: 'asc' }
              }
            }
          }
        }
      });

      return created;
    }
  }

  async updateFormationForTeamSelection(
    fixtureId: number,
    formationId: string,
    resetTeamSelection: boolean = true
  ): Promise<TeamSelectionWithFormation> {
    // Validate formation exists
    await this.getFormationById(formationId);

    const existingSelection = await this.prisma.teamSelection.findUnique({
      where: { fixtureId }
    });

    if (!existingSelection) {
      throw new NotFoundException(`Team selection for fixture ${fixtureId} not found`);
    }

    const updateData: any = {
      formationId,
      version: existingSelection.version + 1
    };

    if (resetTeamSelection) {
      updateData.starting11 = {};
      updateData.substitutes = [];
    }

    return this.prisma.teamSelection.update({
      where: { fixtureId },
      data: updateData,
      include: {
        formation: {
          include: {
            positions: {
              orderBy: { displayOrder: 'asc' }
            }
          }
        }
      }
    });
  }

  async calculateFormationStats(teamId: number): Promise<void> {
    // Get all fixtures for the team that have results
    const fixtures = await this.prisma.fixture.findMany({
      where: {
        teamId,
        isPlayed: true,
        actualFormationId: { not: null }
      },
      select: {
        id: true,
        actualFormationId: true,
        homeGoals: true,
        awayGoals: true
      }
    });

    // Group by formation and calculate stats
    const formationStats = new Map<string, {
      gamesPlayed: number;
      wins: number;
      draws: number;
      losses: number;
      goalsScored: number;
      goalsConceded: number;
    }>();

    fixtures.forEach((fixture: any) => {
      if (!fixture.actualFormationId) return;

      const current = formationStats.get(fixture.actualFormationId) || {
        gamesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsScored: 0,
        goalsConceded: 0
      };

      current.gamesPlayed++;
      current.goalsScored += fixture.homeGoals || 0;
      current.goalsConceded += fixture.awayGoals || 0;

      if ((fixture.homeGoals || 0) > (fixture.awayGoals || 0)) {
        current.wins++;
      } else if ((fixture.homeGoals || 0) === (fixture.awayGoals || 0)) {
        current.draws++;
      } else {
        current.losses++;
      }

      formationStats.set(fixture.actualFormationId, current);
    });

    // Update or create formation stats
    for (const [formationId, stats] of formationStats) {
      await this.prisma.formationStats.upsert({
        where: {
          teamId_formationId: {
            teamId,
            formationId
          }
        },
        update: {
          gamesPlayed: stats.gamesPlayed,
          wins: stats.wins,
          draws: stats.draws,
          losses: stats.losses,
          goalsScored: stats.goalsScored,
          goalsConceded: stats.goalsConceded,
          lastUpdated: new Date()
        },
        create: {
          teamId,
          formationId,
          gamesPlayed: stats.gamesPlayed,
          wins: stats.wins,
          draws: stats.draws,
          losses: stats.losses,
          goalsScored: stats.goalsScored,
          goalsConceded: stats.goalsConceded
        }
      });
    }
  }

  async getFormationPositionMapping(formationId: string): Promise<FormationPositionMapping> {
    const formation = await this.getFormationById(formationId);
    const mapping: FormationPositionMapping = {};

    formation.positions.forEach(position => {
      mapping[position.id] = null;
    });

    return mapping;
  }

  async getFormationComparison(fixtureId: number): Promise<{ plannedFormation: any, actualFormation: any }> {
    const fixture = await this.prisma.fixture.findUnique({
      where: { id: fixtureId },
      include: {
        plannedFormation: {
          include: {
            positions: {
              orderBy: { displayOrder: 'asc' }
            }
          }
        },
        actualFormation: {
          include: {
            positions: {
              orderBy: { displayOrder: 'asc' }
            }
          }
        }
      }
    });

    if (!fixture) {
      throw new NotFoundException(`Fixture with ID ${fixtureId} not found`);
    }

    return {
      plannedFormation: fixture.plannedFormation,
      actualFormation: fixture.actualFormation
    };
  }

  async getFixtureFormationStats(fixtureId: number): Promise<any> {
    const fixture = await this.prisma.fixture.findUnique({
      where: { id: fixtureId },
      include: {
        team: true,
        plannedFormation: true,
        actualFormation: true
      }
    });

    if (!fixture) {
      throw new NotFoundException(`Fixture with ID ${fixtureId} not found`);
    }

    // Get formation stats for the team
    const teamStats = await this.getFormationStats(fixture.teamId);
    
    // Find stats for the actual formation used
    const actualFormationStats = fixture.actualFormationId 
      ? teamStats.find(stat => stat.formationId === fixture.actualFormationId)
      : null;

    return {
      fixture,
      teamFormationStats: teamStats,
      actualFormationStats,
      formationChanged: fixture.plannedFormationId !== fixture.actualFormationId
    };
  }
}
