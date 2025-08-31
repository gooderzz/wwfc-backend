import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { PrismaService } from '../../prisma.service';
import { AwardsController } from './awards.controller';
import { AwardsService } from './awards.service';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';

@Module({
  controllers: [StatsController, AwardsController, InsightsController],
  providers: [StatsService, AwardsService, InsightsService, PrismaService],
})
export class StatsModule {}
