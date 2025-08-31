import { Module } from '@nestjs/common';
import { StandingsController } from './standings.controller';
import { StandingsService } from './standings.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [StandingsController],
  providers: [StandingsService, PrismaService],
  exports: [StandingsService]
})
export class StandingsModule {}
