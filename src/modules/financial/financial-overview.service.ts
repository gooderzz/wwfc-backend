import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PaymentType, PaymentStatus } from '@prisma/client';

export interface TeamDebtSummary {
  teamId: number;
  teamName: string;
  totalDebt: number;
  totalDue: number;
  playerCount: number;
  averageDebt: number;
}

export interface PlayerDebtSummary {
  userId: number;
  userName: string;
  teamName: string;
  currentBalance: number;
  totalDue: number;
  overdueAmount: number;
  feeCount: number;
}

export interface FinancialOverview {
  totalClubDebt: number;
  totalClubDue: number;
  totalOverdue: number;
  teamDebts: TeamDebtSummary[];
  topDebtors: PlayerDebtSummary[];
  feeTypeBreakdown: {
    [key: string]: { count: number; total: number; };
  };
}

@Injectable()
export class FinancialOverviewService {
  private readonly logger = new Logger(FinancialOverviewService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get complete financial overview for admin dashboard
   */
  async getFinancialOverview(): Promise<FinancialOverview> {
    this.logger.log('Generating financial overview');

    // Get all payment records with user and team data
    const allPayments = await this.prisma.paymentRecord.findMany({
      include: {
        user: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Calculate team debts
    const teamDebts = await this.calculateTeamDebts(allPayments);

    // Calculate player debts
    const playerDebts = await this.calculatePlayerDebts(allPayments);

    // Calculate fee type breakdown
    const feeTypeBreakdown = this.calculateFeeTypeBreakdown(allPayments);

    // Calculate overall totals
    const totalClubDebt = teamDebts.reduce((sum, team) => sum + team.totalDebt, 0);
    const totalClubDue = teamDebts.reduce((sum, team) => sum + team.totalDue, 0);
    const totalOverdue = playerDebts.reduce((sum, player) => sum + player.overdueAmount, 0);

    // Get top 10 debtors
    const topDebtors = playerDebts
      .filter(player => player.totalDue > 0)
      .sort((a, b) => b.totalDue - a.totalDue)
      .slice(0, 10);

    return {
      totalClubDebt,
      totalClubDue,
      totalOverdue,
      teamDebts,
      topDebtors,
      feeTypeBreakdown,
    };
  }

  /**
   * Get team debt analysis
   */
  async getTeamDebts(): Promise<TeamDebtSummary[]> {
    const allPayments = await this.prisma.paymentRecord.findMany({
      include: {
        user: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return this.calculateTeamDebts(allPayments);
  }

  /**
   * Get player debt analysis
   */
  async getPlayerDebts(): Promise<PlayerDebtSummary[]> {
    const allPayments = await this.prisma.paymentRecord.findMany({
      include: {
        user: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return this.calculatePlayerDebts(allPayments);
  }

  /**
   * Calculate team debt summaries
   */
  private async calculateTeamDebts(allPayments: any[]): Promise<TeamDebtSummary[]> {
    const teamMap = new Map<number, TeamDebtSummary>();

    for (const payment of allPayments) {
      const teamId = payment.user.team?.id;
      if (!teamId) continue;

      const teamName = payment.user.team.name;
      const finalAmount = parseFloat(payment.finalAmount.toString());
      const paidAmount = parseFloat(payment.paidAmount?.toString() || '0');
      const remainingAmount = finalAmount - paidAmount;

      if (!teamMap.has(teamId)) {
        teamMap.set(teamId, {
          teamId,
          teamName,
          totalDebt: 0,
          totalDue: 0,
          playerCount: 0,
          averageDebt: 0,
        });
      }

      const team = teamMap.get(teamId)!;
      team.totalDebt += finalAmount;

      if (['DUE', 'PARTIAL', 'OVERDUE'].includes(payment.status)) {
        team.totalDue += remainingAmount;
      }
    }

    // Calculate player counts and averages
    const userTeamMap = new Map<number, Set<number>>();
    for (const payment of allPayments) {
      const teamId = payment.user.team?.id;
      const userId = payment.user.id;
      if (!teamId) continue;

      if (!userTeamMap.has(teamId)) {
        userTeamMap.set(teamId, new Set());
      }
      userTeamMap.get(teamId)!.add(userId);
    }

    for (const [teamId, userIds] of userTeamMap) {
      const team = teamMap.get(teamId);
      if (team) {
        team.playerCount = userIds.size;
        team.averageDebt = team.totalDebt / team.playerCount;
      }
    }

    return Array.from(teamMap.values()).sort((a, b) => b.totalDue - a.totalDue);
  }

  /**
   * Calculate player debt summaries
   */
  private async calculatePlayerDebts(allPayments: any[]): Promise<PlayerDebtSummary[]> {
    const playerMap = new Map<number, PlayerDebtSummary>();

    for (const payment of allPayments) {
      const userId = payment.user.id;
      const userName = payment.user.name;
      const teamName = payment.user.team?.name || 'No Team';
      const finalAmount = parseFloat(payment.finalAmount.toString());
      const paidAmount = parseFloat(payment.paidAmount?.toString() || '0');
      const remainingAmount = finalAmount - paidAmount;

      if (!playerMap.has(userId)) {
        playerMap.set(userId, {
          userId,
          userName,
          teamName,
          currentBalance: 0,
          totalDue: 0,
          overdueAmount: 0,
          feeCount: 0,
        });
      }

      const player = playerMap.get(userId)!;
      player.feeCount++;

      // Calculate current balance (simplified - in real implementation, use BalancePaymentService)
      const totalPaid = parseFloat(payment.paidAmount?.toString() || '0');
      const totalOwed = finalAmount;
      player.currentBalance += totalPaid - totalOwed;

      if (['DUE', 'PARTIAL', 'OVERDUE'].includes(payment.status)) {
        player.totalDue += remainingAmount;

        // Check if overdue (due date is in the past)
        if (payment.dueDate < new Date()) {
          player.overdueAmount += remainingAmount;
        }
      }
    }

    return Array.from(playerMap.values()).sort((a, b) => b.totalDue - a.totalDue);
  }

  /**
   * Calculate fee type breakdown
   */
  private calculateFeeTypeBreakdown(allPayments: any[]): { [key: string]: { count: number; total: number; } } {
    const breakdown: { [key: string]: { count: number; total: number; } } = {};

    for (const payment of allPayments) {
      const paymentType = payment.paymentType;
      const finalAmount = parseFloat(payment.finalAmount.toString());

      if (!breakdown[paymentType]) {
        breakdown[paymentType] = { count: 0, total: 0 };
      }

      breakdown[paymentType].count++;
      breakdown[paymentType].total += finalAmount;
    }

    return breakdown;
  }
}
