import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma.service';
import { AdminController } from './admin.controller';
import { FixturesModule } from '../fixtures/fixtures.module';
import { TeamsModule } from '../teams/teams.module';

@Module({
  imports: [FixturesModule, TeamsModule],
  controllers: [UsersController, AdminController],
  providers: [UsersService, PrismaService],
})
export class UsersModule {}
