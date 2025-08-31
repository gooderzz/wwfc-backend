import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeaderboard() {
    // Aggregate total points (goals, assists, bonusPoints, etc.)
    const users = await this.prisma.user.findMany({
      include: {
        team: true,
        playerStats: true,
      },
    });
    return users
      .map((u) => {
        const appearances = u.playerStats.length;
        const totalPoints = u.playerStats.reduce(
          (sum, s) =>
            sum +
            s.goals * 4 +
            s.assists * 3 +
            (s.rating || 0) +
            (s.bonusPoints || 0),
          0,
        );
        return {
          id: u.id,
          name: u.name,
          team: u.team?.name,
          appearances,
          totalPoints,
          fantasyValue: u.fantasyValue,
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }

  async getTeamLeaderboard(teamId: number) {
    const users = await this.prisma.user.findMany({
      where: { teamId },
      include: { team: true, playerStats: true },
    });
    return users
      .map((u) => {
        const appearances = u.playerStats.length;
        const totalPoints = u.playerStats.reduce(
          (sum, s) =>
            sum +
            s.goals * 4 +
            s.assists * 3 +
            (s.rating || 0) +
            (s.bonusPoints || 0),
          0,
        );
        return {
          id: u.id,
          name: u.name,
          team: u.team?.name,
          appearances,
          totalPoints,
          fantasyValue: u.fantasyValue,
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }

  async getPlayerStats(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        playerStats: { include: { fixture: true } },
        team: true,
      },
    });
    if (!user) return null;
    const seasonTotal = user.playerStats.reduce(
      (sum, s) =>
        sum +
        s.goals * 4 +
        s.assists * 3 +
        (s.rating || 0) +
        (s.bonusPoints || 0),
      0,
    );
    return {
      id: user.id,
      name: user.name,
      team: user.team?.name,
      fantasyValue: user.fantasyValue,
      appearances: user.playerStats.length,
      seasonTotal,
      fixtures: user.playerStats.map((s) => ({
        date: s.fixture.date,
        opponent: s.fixture.opponent,
        goals: s.goals,
        assists: s.assists,
        rating: s.rating,
        bonusPoints: s.bonusPoints,
        pointsEarned:
          s.goals * 4 + s.assists * 3 + (s.rating || 0) + (s.bonusPoints || 0),
      })),
    };
  }
}
