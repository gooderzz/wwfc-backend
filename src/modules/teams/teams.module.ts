import { Module } from '@nestjs/common';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { TeamIdentityService } from './team-identity.service';
import { PrismaService } from '../../prisma.service';

@Module({
  imports: [],
  controllers: [TeamsController],
  providers: [TeamsService, TeamIdentityService, PrismaService],
  exports: [TeamsService, TeamIdentityService],
})
export class TeamsModule {}
