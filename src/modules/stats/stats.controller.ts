import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('leaderboard')
  getLeaderboard() {
    return this.statsService.getLeaderboard();
  }

  @Get('team/:teamId')
  getTeamLeaderboard(@Param('teamId', ParseIntPipe) teamId: number) {
    return this.statsService.getTeamLeaderboard(teamId);
  }

  @Get('player/:userId')
  getPlayerStats(@Param('userId', ParseIntPipe) userId: number) {
    return this.statsService.getPlayerStats(userId);
  }
}
