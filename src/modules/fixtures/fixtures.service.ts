import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { RSVPStatus } from '@prisma/client';
import { UpdateResultDto } from './dto/update-result.dto';
import { PlayerStatsDto } from './dto/player-stats.dto';
import { BonusVoteDto } from './dto/bonus-vote.dto';
import { EventsService } from '../events/events.service';
import { FeeIntegrationService } from '../financial/fee-integration.service';

@Injectable()
export class FixturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly feeIntegrationService: FeeIntegrationService,
  ) {}

  async createFixture(
    teamId: number,
    fixtureType: string,
    opponent: string,
    date: Date,
    kickOffTime: Date,
    user: any,
    location: string = 'HOME',
    address?: string,
    cupName?: string,
    seasonId?: string,
  ) {
    // Only managers or admins can create fixtures
    if (user && user.role !== 'MANAGER' && user.role !== 'ADMIN')
      throw new ForbiddenException('Only managers or admins can create fixtures');
    
    return this.prisma.fixture.create({
      data: { 
        teamId, 
        fixtureType: fixtureType as any,
        opponent, 
        date, 
        kickOffTime,
        location: location as any,
        ...(address && { address }),
        ...(cupName && { cupName }),
        ...(seasonId && { seasonId })
      },
    });
  }

  async getFixturesForTeam(teamId: number, userId?: number) {
    const fixtures = await this.prisma.fixture.findMany({
      where: { teamId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            division: true,
          },
        },
        rsvps: {
          where: userId ? { userId } : undefined,
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Transform the data to match the frontend interface
    return fixtures.map(fixture => ({
      ...fixture,
      rsvp: fixture.rsvps.length > 0 ? fixture.rsvps[0] : undefined,
      rsvps: undefined, // Remove the rsvps array from the response
    }));
  }

  async getAllFixtures() {
    return this.prisma.fixture.findMany({
      include: {
        team: {
          select: {
            id: true,
            name: true,
            division: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  async getTeamsByDivision(divisionId: string) {
    // Get teams from the same division using scraped team data
    return this.prisma.scrapedTeam.findMany({
      where: {
        divisionId: divisionId,
        isActive: true,
        seasonId: "965423047", // Current season
        NOT: { teamName: { startsWith: 'Division' } }
      },
      include: {
        teamIdentity: {
          include: {
            appTeam: true // Include app team that is mapped
          }
        }
      },
      orderBy: { teamName: 'asc' }
    });
  }

  async searchTeams(query: string) {
    // Search teams by name across all divisions
    const whereClause: any = {
      isActive: true,
      seasonId: "965423047", // Current season
      NOT: { teamName: { startsWith: 'Division' } }
    };

    // If query is provided, add name search
    if (query && query.trim()) {
      whereClause.teamName = {
        contains: query,
        mode: 'insensitive'
      };
    }

    return this.prisma.scrapedTeam.findMany({
      where: whereClause,
      include: {
        teamIdentity: {
          include: {
            appTeam: true // Include app team that is mapped
          }
        }
      },
      take: query && query.trim() ? 10 : 50, // More results for empty query
      orderBy: { teamName: 'asc' }
    });
  }

  async getTeamHomeAddress(teamId: number) {
    return this.prisma.team.findUnique({
      where: { id: teamId },
      select: { homeAddress: true }
    });
  }

  async addRSVP(fixtureId: number, userId: number, status: RSVPStatus) {
    // Upsert RSVP for this user/fixture
    return this.prisma.fixtureRSVP.upsert({
      where: { userId_fixtureId: { userId, fixtureId } },
      update: { status },
      create: { userId, fixtureId, status },
    });
  }

  async getRSVPsForFixture(fixtureId: number) {
    return this.prisma.fixtureRSVP.findMany({
      where: { 
        fixtureId,
        user: {
          status: {
            not: 'INJURED'
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async getUserRSVPs(userId: number) {
    return this.prisma.fixtureRSVP.findMany({
      where: { userId },
      include: {
        fixture: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                division: true,
              },
            },
          },
        },
      },
      orderBy: {
        fixture: {
          date: 'asc',
        },
      },
    });
  }

  async getFixtureById(id: number, user: any) {
    const fixture = await this.prisma.fixture.findUnique({
      where: { id },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            division: true,
          },
        },
      },
    });

    if (!fixture) {
      throw new Error('Fixture not found');
    }

    // Check if user has access to this fixture
    if (user.role !== 'ADMIN' && fixture.teamId !== user.teamId) {
      throw new Error('Access denied');
    }

    return fixture;
  }

  async saveTeamSelection(fixtureId: number, selection: { 
    starting11: {
      gk: number | null;
      lb: number | null;
      cb1: number | null;
      cb2: number | null;
      rb: number | null;
      dm: number | null;
      cm: number | null;
      am: number | null;
      lw: number | null;
      st: number | null;
      rw: number | null;
    };
    substitutes: number[];
  }, user: any) {
    const fixture = await this.prisma.fixture.findUnique({ where: { id: fixtureId } });
    if (!fixture) throw new Error('Fixture not found');
    if (user.role !== 'ADMIN' && fixture.teamId !== user.teamId) throw new Error('Access denied');

    // Validate that all starting 11 positions are filled
    const starting11Values = Object.values(selection.starting11);
    if (starting11Values.some(id => id === null)) {
      throw new Error('All starting 11 positions must be filled');
    }

    // Check for duplicate players
    const allPlayerIds = [...starting11Values, ...selection.substitutes];
    const uniquePlayerIds = new Set(allPlayerIds);
    if (allPlayerIds.length !== uniquePlayerIds.size) {
      throw new Error('Each player can only be selected once');
    }

    // Validate that selected players are available (RSVP = YES) and not injured
    const validPlayerIds = allPlayerIds.filter(id => id !== null) as number[];
    
    // Get detailed information about selected players
    const selectedPlayers = await this.prisma.user.findMany({
      where: { id: { in: validPlayerIds } },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    // Get RSVP status for selected players
    const rsvps = await this.prisma.fixtureRSVP.findMany({
      where: { 
        fixtureId, 
        userId: { in: validPlayerIds }
      },
      select: {
        userId: true,
        status: true,
      },
    });

    const rsvpMap = new Map(rsvps.map(rsvp => [rsvp.userId, rsvp.status]));
    const playerMap = new Map(selectedPlayers.map(player => [player.id, player]));

    // Check each selected player
    const unavailablePlayers = [];
    for (const playerId of validPlayerIds) {
      const player = playerMap.get(playerId);
      const rsvpStatus = rsvpMap.get(playerId);
      
      if (!player) {
        unavailablePlayers.push(`Player ID ${playerId} not found`);
        continue;
      }
      
      if (player.status === 'INJURED') {
        unavailablePlayers.push(`${player.name} is injured`);
        continue;
      }
      
      // Only warn about RSVP status, don't block selection
      if (rsvpStatus !== 'YES') {
        console.warn(`${player.name} has not RSVP'd as available (status: ${rsvpStatus || 'No RSVP'}) - but allowing selection anyway`);
      }
    }
    
    if (unavailablePlayers.length > 0) {
      throw new Error(`Cannot select team: ${unavailablePlayers.join(', ')}`);
    }

    // Save team selection to database using upsert
    const teamSelection = await this.prisma.teamSelection.upsert({
      where: { fixtureId },
      update: {
        starting11: selection.starting11,
        substitutes: selection.substitutes,
        createdBy: user.userId,
        updatedAt: new Date(),
      },
      create: {
        fixtureId,
        starting11: selection.starting11,
        substitutes: selection.substitutes,
        createdBy: user.userId,
      },
    });
    
    return { 
      message: 'Team selection saved successfully', 
      fixtureId, 
      selection: teamSelection,
      starting11Count: starting11Values.filter(id => id !== null).length,
      substitutesCount: selection.substitutes.length
    };
  }

  async getTeamSelection(fixtureId: number, user: any) {
    const fixture = await this.prisma.fixture.findUnique({ where: { id: fixtureId } });
    if (!fixture) throw new Error('Fixture not found');
    if (user.role !== 'ADMIN' && fixture.teamId !== user.teamId) throw new Error('Access denied');
    
    // Get the saved team selection
    const teamSelection = await this.prisma.teamSelection.findUnique({
      where: { fixtureId },
    });
    
    if (!teamSelection) {
      // Return empty selection if none exists
      return { 
        fixtureId, 
        selection: {
          starting11: {
            gk: null,
            lb: null,
            cb1: null,
            cb2: null,
            rb: null,
            dm: null,
            cm: null,
            am: null,
            lw: null,
            st: null,
            rw: null,
          },
          substitutes: []
        }
      };
    }
    
    return { 
      fixtureId, 
      selection: {
        starting11: teamSelection.starting11 as any,
        substitutes: teamSelection.substitutes as number[]
      }
    };
  }

  async saveActualTeamSelection(fixtureId: number, selection: { 
    starting11: {
      gk: number | null;
      lb: number | null;
      cb1: number | null;
      cb2: number | null;
      rb: number | null;
      dm: number | null;
      cm: number | null;
      am: number | null;
      lw: number | null;
      st: number | null;
      rw: number | null;
    };
    substitutes: number[];
  }, user: any) {
    const fixture = await this.prisma.fixture.findUnique({ where: { id: fixtureId } });
    if (!fixture) throw new Error('Fixture not found');
    if (user.role !== 'ADMIN' && fixture.teamId !== user.teamId) throw new Error('Access denied');

    // For actual team selection, we're more flexible - not all positions need to be filled
    // and players don't need to have RSVP'd YES (they might have shown up anyway)
    const starting11Values = Object.values(selection.starting11);
    const filledPositions = starting11Values.filter(id => id !== null);
    
    if (filledPositions.length === 0) {
      throw new Error('At least one player must be selected for the starting 11');
    }

    // Check for duplicate players
    const allPlayerIds = [...starting11Values, ...selection.substitutes];
    const uniquePlayerIds = new Set(allPlayerIds.filter(id => id !== null));
    if (allPlayerIds.filter(id => id !== null).length !== uniquePlayerIds.size) {
      throw new Error('Each player can only be selected once');
    }

    // Save actual team selection to database using upsert
    const actualTeamSelection = await this.prisma.actualTeamSelection.upsert({
      where: { fixtureId },
      update: {
        starting11: selection.starting11,
        substitutes: selection.substitutes,
        createdBy: user.userId,
        updatedAt: new Date(),
      },
      create: {
        fixtureId,
        starting11: selection.starting11,
        substitutes: selection.substitutes,
        createdBy: user.userId,
      },
    });

    // Note: Match fees will be created after match events are saved in updateResult()
    // This ensures we have all substitution information for proper discount calculation
    
    return { 
      message: 'Actual team selection saved successfully', 
      fixtureId, 
      selection: actualTeamSelection,
      starting11Count: filledPositions.length,
      substitutesCount: selection.substitutes.length
    };
  }

  async getActualTeamSelection(fixtureId: number, user: any) {
    const fixture = await this.prisma.fixture.findUnique({ where: { id: fixtureId } });
    if (!fixture) throw new Error('Fixture not found');
    if (user.role !== 'ADMIN' && fixture.teamId !== user.teamId) throw new Error('Access denied');
    
    // Get the saved actual team selection
    const actualTeamSelection = await this.prisma.actualTeamSelection.findUnique({
      where: { fixtureId },
    });
    
    if (!actualTeamSelection) {
      // Return empty selection if none exists
      return { 
        fixtureId, 
        selection: {
          starting11: {
            gk: null,
            lb: null,
            cb1: null,
            cb2: null,
            rb: null,
            dm: null,
            cm: null,
            am: null,
            lw: null,
            st: null,
            rw: null,
          },
          substitutes: []
        }
      };
    }
    
    const response = { 
      fixtureId, 
      selection: {
        starting11: actualTeamSelection.starting11 as any,
        substitutes: actualTeamSelection.substitutes as number[]
      }
    };
    
    console.log('=== getActualTeamSelection API Response ===');
    console.log('Raw starting11 from DB:', JSON.stringify(actualTeamSelection.starting11));
    console.log('Raw substitutes from DB:', JSON.stringify(actualTeamSelection.substitutes));
    console.log('Response starting11 type:', typeof response.selection.starting11);
    console.log('Response starting11:', JSON.stringify(response.selection.starting11));
    console.log('Response starting11 isArray:', Array.isArray(response.selection.starting11));
    console.log('Response substitutes:', JSON.stringify(response.selection.substitutes));
    console.log('Response substitutes isArray:', Array.isArray(response.selection.substitutes));
    
    return response;
  }

  async updatePlayerRSVP(fixtureId: number, userId: number, status: 'YES' | 'NO' | 'MAYBE', user: any) {
    // Check if fixture exists and user has access
    const fixture = await this.prisma.fixture.findUnique({
      where: { id: fixtureId },
    });

    if (!fixture) {
      throw new Error('Fixture not found');
    }

    if (user.role !== 'ADMIN' && fixture.teamId !== user.teamId) {
      throw new Error('Access denied');
    }

    // Check if the target user belongs to the same team
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser || targetUser.teamId !== fixture.teamId) {
      throw new Error('User not found or not part of this team');
    }

    // Check if manager is trying to update their own RSVP
    if (user.userId === userId) {
      throw new Error('Managers cannot update their own RSVP through this endpoint');
    }

    // Create or update the RSVP
    return this.prisma.fixtureRSVP.upsert({
      where: { userId_fixtureId: { userId, fixtureId } },
      update: { status },
      create: { userId, fixtureId, status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });
  }

  async createRSVP(userId: number, fixtureId: number, status: 'YES' | 'NO' | 'MAYBE') {
    // Find the corresponding event for this fixture
    const event = await this.prisma.event.findFirst({
      where: {
        eventType: 'FIXTURE',
        teamId: {
          not: null,
        },
        title: {
          contains: 'vs',
        },
      },
    });

    if (!event) {
      throw new Error('Corresponding event not found for this fixture');
    }

    // Use the events service to create the RSVP
    const rsvp = await this.eventsService.createRSVP(event.id, { status }, userId);

    // Check if user is injured and provide warning
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    let warningMessage = null;
    if (user && user.status === 'INJURED') {
      warningMessage = 'You are currently marked as injured. Your RSVP will be recorded but you will not be available for team selection until your injury status is updated.';
    }

    return {
      ...rsvp,
      warning: warningMessage,
      isAvailable: user ? user.status !== 'INJURED' && status === 'YES' : false,
    };
  }

  async updateResult(fixtureId: number, user: any, dto: UpdateResultDto) {
    // Only manager or admin can update
    const fixture = await this.prisma.fixture.findUnique({
      where: { id: fixtureId },
      include: { team: true },
    });
    if (!fixture) throw new NotFoundException('Fixture not found');
    if (user.role !== 'MANAGER' && user.role !== 'ADMIN')
      throw new ForbiddenException('Only managers and admins can update results');
    
    // Check if user manages this team (unless admin)
    if (user.role === 'MANAGER' && user.teamId !== fixture.teamId)
      throw new ForbiddenException('Not manager of this team');

    // Start a transaction to handle both fixture update and match events
    const updatedFixture = await this.prisma.$transaction(async (prisma) => {
      // Update the fixture
      const updatedFixture = await prisma.fixture.update({
        where: { id: fixtureId },
        data: {
          homeGoals: dto.homeGoals,
          awayGoals: dto.awayGoals,
          isPlayed: true,
          resultType: dto.resultType,
          walkoverType: dto.walkoverType,
          postponementReason: dto.postponementReason,
          totalSaves: dto.totalSaves,
          actualFormationId: dto.actualFormationId,
          plannedFormationId: dto.plannedFormationId,
          formationChanged: dto.formationChanged,
        },
      });

      // If there are match events, create them
      if (dto.matchEvents && dto.matchEvents.length > 0) {
        // Handle card fee deletion for existing match events before deleting them
        try {
          const existingCardEvents = await prisma.matchEvent.findMany({
            where: { 
              fixtureId,
              eventType: 'CARD',
              cardType: { in: ['YELLOW', 'RED'] }
            }
          });

          for (const cardEvent of existingCardEvents) {
            try {
              await this.feeIntegrationService.handleCardFeeDeletion(
                cardEvent.id, 
                cardEvent.playerId
              );
            } catch (error) {
              console.error(`Failed to handle card fee deletion for event ${cardEvent.id}:`, error);
              // Don't fail the transaction if fee deletion fails
            }
          }
        } catch (error) {
          console.error('Failed to handle existing card fee deletions:', error);
          // Don't fail the transaction if fee deletion fails
        }

        // Delete existing match events for this fixture
        await prisma.matchEvent.deleteMany({
          where: { fixtureId }
        });

        // Create new match events
        for (const event of dto.matchEvents) {
          const createdEvent = await prisma.matchEvent.create({
            data: {
              fixtureId,
              eventType: event.eventType as any,
              minute: event.minute,
              playerId: event.playerId,
              goalType: event.goalType,
              assistedById: event.assistedById,
              cardType: event.cardType as any,
              substitutedForId: event.substitutedForId,
              notes: event.notes,
            },
          });

          // Create card fees for yellow and red cards
          if (event.eventType === 'CARD' && (event.cardType === 'YELLOW' || event.cardType === 'RED')) {
            try {
              await this.feeIntegrationService.createCardFee(
                event.playerId, 
                createdEvent.id, 
                event.cardType, 
                fixtureId
              );
            } catch (error) {
              console.error(`Failed to create card fee for event ${createdEvent.id}:`, error);
              // Don't fail the transaction if fee creation fails
            }
          }
        }

        // Create match fees for players who actually played (after events are saved)
        try {
          // Get the actual team selection to create fees
          const actualTeamSelection = await prisma.actualTeamSelection.findUnique({
            where: { fixtureId }
          });
          
          if (actualTeamSelection) {
            await this.feeIntegrationService.createMatchFeesForTeamSelection(fixtureId, {
              starting11: actualTeamSelection.starting11 as any,
              substitutes: actualTeamSelection.substitutes as number[]
            });
          }
        } catch (error) {
          console.error('Failed to create match fees:', error);
          // Don't fail the transaction if fee creation fails
        }
      }

      return updatedFixture;
    });

    // Apply match minutes discounts based on substitution events (AFTER transaction commits)
    // This needs to be outside the transaction so it can see the newly saved match events
    try {
      await this.feeIntegrationService.applyMatchMinutesDiscountsFromEvents(fixtureId);
    } catch (error) {
      console.error('Failed to apply match minutes discounts:', error);
      // Don't fail the transaction if discount application fails
    }

    return updatedFixture;
  }

  async submitPlayerStats(
    fixtureId: number,
    user: any,
    stats: PlayerStatsDto[],
  ) {
    // Only manager of the team can submit
    const fixture = await this.prisma.fixture.findUnique({
      where: { id: fixtureId },
      include: { team: true },
    });
    if (!fixture) throw new NotFoundException('Fixture not found');
    if (user.role !== 'MANAGER')
      throw new ForbiddenException('Only managers can submit stats');
    if (user.teamId !== fixture.teamId)
      throw new ForbiddenException('Not manager of this team');
    // Check for duplicates
    for (const stat of stats) {
      const exists = await this.prisma.playerStats.findUnique({
        where: { userId_fixtureId: { userId: stat.userId, fixtureId } },
      });
      if (exists)
        throw new ForbiddenException('Duplicate stats for user/fixture');
    }
    // Create all stats
    return Promise.all(
      stats.map((stat) =>
        this.prisma.playerStats.create({
          data: { ...stat, fixtureId },
        }),
      ),
    );
  }

  async submitBonusVote(fixtureId: number, user: any, dto: BonusVoteDto) {
    // Only users who played in the fixture can vote
    const now = new Date();
    const fixture = await this.prisma.fixture.findUnique({
      where: { id: fixtureId },
    });
    if (!fixture) throw new NotFoundException('Fixture not found');
    if (now.getTime() - fixture.date.getTime() > 72 * 60 * 60 * 1000)
      throw new ForbiddenException('Voting closed');
    const played = await this.prisma.playerStats.findUnique({
      where: { userId_fixtureId: { userId: user.userId, fixtureId } },
    });
    if (!played)
      throw new ForbiddenException('Only players in this fixture can vote');
    // Prevent duplicate voting
    const existing = await this.prisma.bonusVote.findUnique({
      where: { userId_fixtureId: { userId: user.userId, fixtureId } },
    });
    if (existing) throw new ForbiddenException('Already voted');
    // Save votes
    for (const vote of dto.votes) {
      await this.prisma.bonusVote.create({
        data: { userId: vote.userId, fixtureId, rank: vote.rank },
      });
    }
    return { success: true };
  }

  async aggregateBonusVotes(fixtureId: number) {
    // Aggregate votes and award bonus points
    const votes = await this.prisma.bonusVote.findMany({
      where: { fixtureId },
    });
    // Count votes per user by rank
    const points: Record<number, number> = {};
    for (const vote of votes) {
      points[vote.userId] =
        (points[vote.userId] || 0) +
        (vote.rank === 1 ? 3 : vote.rank === 2 ? 2 : 1);
    }
    // Sort and get top 3
    const sorted = Object.entries(points)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    // Award bonus points to PlayerStats
    for (let i = 0; i < sorted.length; i++) {
      const [userId, pts] = sorted[i];
      const bonus = 3 - i; // 3, 2, 1
      await this.prisma.playerStats.update({
        where: { userId_fixtureId: { userId: Number(userId), fixtureId } },
        data: { bonusPoints: bonus },
      });
    }
    return { success: true };
  }
}
