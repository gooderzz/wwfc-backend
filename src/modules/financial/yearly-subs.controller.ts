import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FeeIntegrationService } from './fee-integration.service';
import { PrismaService } from '../../prisma.service';
import { FAFullTimeScraperService } from '../scraping/fa-fulltime-scraper.service';
import { Season } from '../scraping/scraping.types';

@Controller('financial/yearly-subs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class YearlySubsController {
  constructor(
    private readonly feeIntegrationService: FeeIntegrationService,
    private readonly prisma: PrismaService,
    private readonly scrapingService: FAFullTimeScraperService,
  ) {}

  /**
   * Get available seasons from scraping data
   */
  @Get('seasons')
  @Roles('ADMIN')
  async getAvailableSeasons() {
    try {
      const discovery = await this.scrapingService.discoverAll();
      const seasons = discovery.seasons || [];
      
      // Convert season IDs to readable names
      const seasonMapping: Record<string, string> = {
        '965423047': '2025/26',
        '289885282': '2024/25',
        '728261395': '2023/24',
        '928979507': '2022/23',
        '285246320': '2021/22',
        '92146673': '2020/21',
        '480699350': '2019/20',
        '484154006': '2018/19',
        '396000312': '2017/18',
        '408332512': '2016/17',
      };

      const formattedSeasons = seasons.map((season: Season) => ({
        id: season.id,
        name: seasonMapping[season.id] || season.name,
        isLive: season.isLive,
        year: season.year,
        originalName: season.name
      }));

      return {
        success: true,
        seasons: formattedSeasons,
        currentSeason: formattedSeasons.find((s: any) => s.isLive)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        seasons: []
      };
    }
  }

  /**
   * Get all players for yearly subscription management
   */
  @Get('players/:seasonId')
  @Roles('ADMIN')
  async getPlayersForSeason(@Param('seasonId') seasonId: string) {
    try {
      // Get all users across all teams (including admins, managers, players, injured, etc.)
      const players = await this.prisma.user.findMany({
        where: {
          status: {
            in: ['ACTIVE', 'INJURED', 'RETIRED', 'PROMOTED']
          }
        },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              division: true
            }
          }
        },
        orderBy: [
          { team: { name: 'asc' } },
          { name: 'asc' }
        ]
      });

      // Get existing yearly subscriptions for this season
      const existingSubscriptions = await this.prisma.paymentRecord.findMany({
        where: {
          paymentType: 'YEARLY_SUBS',
          notes: {
            contains: seasonId
          }
        },
        select: {
          userId: true,
          status: true,
          paidAmount: true,
          finalAmount: true
        }
      });

      // Create a map of existing subscriptions
      const subscriptionMap = new Map();
      existingSubscriptions.forEach(sub => {
        subscriptionMap.set(sub.userId, {
          hasSubscription: true,
          status: sub.status,
          paidAmount: parseFloat(sub.paidAmount.toString()),
          finalAmount: parseFloat(sub.finalAmount.toString())
        });
      });

      // Format all users with subscription status (including injured, retired, etc.)
      const formattedPlayers = players.map(player => ({
        id: player.id,
        name: player.name,
        email: player.email,
        status: player.status,
        team: player.team ? {
          id: player.team.id,
          name: player.team.name,
          division: player.team.division
        } : null,
        subscription: subscriptionMap.get(player.id) || {
          hasSubscription: false,
          status: null,
          paidAmount: 0,
          finalAmount: 0
        }
      }));

      return {
        success: true,
        players: formattedPlayers,
        totalUsers: formattedPlayers.length,
        subscribedUsers: formattedPlayers.filter(p => p.subscription.hasSubscription).length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        players: []
      };
    }
  }

  /**
   * Get payment status for a specific season
   */
  @Get('status/:seasonId')
  @Roles('ADMIN')
  async getSeasonStatus(@Param('seasonId') seasonId: string) {
    try {
      // Get season info
      const discovery = await this.scrapingService.discoverAll();
      const season = discovery.seasons?.find((s: Season) => s.id === seasonId);
      
      if (!season) {
        return {
          success: false,
          error: 'Season not found'
        };
      }

      // Get all yearly subscriptions for this season
      const subscriptions = await this.prisma.paymentRecord.findMany({
        where: {
          paymentType: 'YEARLY_SUBS',
          notes: {
            contains: seasonId
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              team: {
                select: {
                  id: true,
                  name: true,
                  division: true
                }
              }
            }
          }
        }
      });

      // Calculate statistics
      const totalSubscriptions = subscriptions.length;
      const paidSubscriptions = subscriptions.filter(s => s.status === 'PAID').length;
      const dueSubscriptions = subscriptions.filter(s => s.status === 'DUE').length;
      const partialSubscriptions = subscriptions.filter(s => s.status === 'PARTIAL').length;
      const overdueSubscriptions = subscriptions.filter(s => s.status === 'OVERDUE').length;

      const totalAmount = subscriptions.reduce((sum, s) => sum + parseFloat(s.finalAmount.toString()), 0);
      const paidAmount = subscriptions.reduce((sum, s) => sum + parseFloat(s.paidAmount.toString()), 0);

      return {
        success: true,
        season: {
          id: season.id,
          name: season.name,
          isLive: season.isLive,
          year: season.year
        },
        statistics: {
          totalSubscriptions,
          paidSubscriptions,
          dueSubscriptions,
          partialSubscriptions,
          overdueSubscriptions,
          totalAmount,
          paidAmount,
          outstandingAmount: totalAmount - paidAmount
        },
        subscriptions: subscriptions.map(sub => ({
          id: sub.id,
          userId: sub.userId,
          userName: sub.user.name,
          userEmail: sub.user.email,
          team: sub.user.team,
          status: sub.status,
          amount: parseFloat(sub.amount.toString()),
          finalAmount: parseFloat(sub.finalAmount.toString()),
          paidAmount: parseFloat(sub.paidAmount.toString()),
          dueDate: sub.dueDate,
          createdAt: sub.createdAt
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create yearly subscriptions for selected players
   */
  @Post('create')
  @Roles('ADMIN')
  async createYearlySubscriptions(@Body() createDto: {
    seasonId: string;
    playerIds: number[];
    amount?: number;
  }) {
    try {
      const { seasonId, playerIds, amount } = createDto;

      if (!seasonId || !playerIds || playerIds.length === 0) {
        return {
          success: false,
          error: 'Season ID and player IDs are required'
        };
      }

      // Get season info for the notes
      const discovery = await this.scrapingService.discoverAll();
      const season = discovery.seasons?.find((s: Season) => s.id === seasonId);
      
      if (!season) {
        return {
          success: false,
          error: 'Season not found'
        };
      }

      // Get configured amount if not provided
      let subscriptionAmount = amount;
      if (!subscriptionAmount) {
        try {
          const config = await this.prisma.paymentConfig.findUnique({
            where: {
              paymentType: 'YEARLY_SUBS',
              isActive: true
            }
          });
          subscriptionAmount = config ? parseFloat(config.amount.toString()) : 50.00;
        } catch {
          subscriptionAmount = 50.00; // Default fallback
        }
      }

      // Check for existing subscriptions to prevent duplicates
      const existingSubscriptions = await this.prisma.paymentRecord.findMany({
        where: {
          paymentType: 'YEARLY_SUBS',
          userId: { in: playerIds },
          notes: {
            contains: seasonId
          }
        },
        select: { userId: true }
      });

      const existingUserIds = existingSubscriptions.map(s => s.userId);
      const newPlayerIds = playerIds.filter(id => !existingUserIds.includes(id));

      if (newPlayerIds.length === 0) {
        return {
          success: false,
          error: 'All selected players already have yearly subscriptions for this season'
        };
      }

      // Create subscriptions
      await this.feeIntegrationService.createYearlySubscriptions(
        newPlayerIds,
        seasonId,
        subscriptionAmount
      );

      return {
        success: true,
        message: `Created yearly subscriptions for ${newPlayerIds.length} players`,
        seasonId,
        seasonName: season.name,
        amount: subscriptionAmount,
        createdFor: newPlayerIds,
        skipped: existingUserIds.length > 0 ? existingUserIds : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
