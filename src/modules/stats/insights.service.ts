import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class InsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTeamInsights() {
    const teams = await this.prisma.team.findMany({
      include: {
        users: { include: { playerStats: true } },
      },
    });
    return teams.map((team) => {
      const currentPlayers = team.users;
      const goals = currentPlayers.reduce(
        (sum, u) => sum + u.playerStats.reduce((s, ps) => s + ps.goals, 0),
        0,
      );
      const assists = currentPlayers.reduce(
        (sum, u) => sum + u.playerStats.reduce((s, ps) => s + ps.assists, 0),
        0,
      );
      const appearances = currentPlayers.reduce(
        (sum, u) => sum + u.playerStats.length,
        0,
      );
      const totalPoints = currentPlayers.reduce(
        (sum, u) =>
          sum +
          u.playerStats.reduce(
            (s, ps) =>
              s +
              ps.goals * 4 +
              ps.assists * 3 +
              (ps.rating || 0) +
              (ps.bonusPoints || 0),
            0,
          ),
        0,
      );
      const avgFantasyValue =
        currentPlayers.length > 0
          ? currentPlayers.reduce((sum, u) => sum + (u.fantasyValue || 0), 0) /
            currentPlayers.length
          : 0;
      return {
        teamId: team.id,
        name: team.name,
        goals,
        assists,
        appearances,
        totalPoints,
        avgFantasyValue: Math.round(avgFantasyValue * 100) / 100,
      };
    });
  }
}
