import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AwardsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSeasonAwards() {
    // Top Scorer
    const topScorerAgg = await this.prisma.playerStats.groupBy({
      by: ['userId'],
      _sum: { goals: true },
      orderBy: { _sum: { goals: 'desc' } },
      take: 1,
    });
    const topScorerUser = topScorerAgg[0]
      ? await this.prisma.user.findUnique({
          where: { id: topScorerAgg[0].userId },
          include: { team: true },
        })
      : null;
    // Top Assist
    const topAssistAgg = await this.prisma.playerStats.groupBy({
      by: ['userId'],
      _sum: { assists: true },
      orderBy: { _sum: { assists: 'desc' } },
      take: 1,
    });
    const topAssistUser = topAssistAgg[0]
      ? await this.prisma.user.findUnique({
          where: { id: topAssistAgg[0].userId },
          include: { team: true },
        })
      : null;
    // MVP (most points)
    const users = await this.prisma.user.findMany({
      include: { team: true, playerStats: true },
    });
    const mvp = users
      .map((u) => ({
        ...u,
        totalPoints: u.playerStats.reduce(
          (sum, s) =>
            sum +
            s.goals * 4 +
            s.assists * 3 +
            (s.rating || 0) +
            (s.bonusPoints || 0),
          0,
        ),
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)[0];
    // Best Avg Rating (min 3 apps)
    const bestAvg = users
      .filter((u) => u.playerStats.length >= 3)
      .map((u) => ({
        ...u,
        avgRating:
          u.playerStats.reduce((sum, s) => sum + (s.rating || 0), 0) /
          u.playerStats.length,
      }))
      .sort((a, b) => b.avgRating - a.avgRating)[0];
    // Most Improved (stub)
    // If previous season data available, compare totalPoints this season vs last
    // For now, return null
    return [
      topScorerUser && {
        awardName: 'Top Scorer',
        userId: topScorerUser.id,
        name: topScorerUser.name,
        team: topScorerUser.team?.name,
        stat: topScorerAgg[0]._sum.goals,
      },
      topAssistUser && {
        awardName: 'Top Assist Maker',
        userId: topAssistUser.id,
        name: topAssistUser.name,
        team: topAssistUser.team?.name,
        stat: topAssistAgg[0]._sum.assists,
      },
      mvp && {
        awardName: 'Most Valuable Player',
        userId: mvp.id,
        name: mvp.name,
        team: mvp.team?.name,
        stat: mvp.totalPoints,
      },
      bestAvg && {
        awardName: 'Best Average Rating',
        userId: bestAvg.id,
        name: bestAvg.name,
        team: bestAvg.team?.name,
        stat: Math.round(bestAvg.avgRating * 100) / 100,
      },
    ].filter(Boolean);
  }
}
