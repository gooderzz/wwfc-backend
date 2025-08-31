import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FixturesModule } from './modules/fixtures/fixtures.module';
import { TeamsModule } from './modules/teams/teams.module';
import { StatsModule } from './modules/stats/stats.module';
import { PositionsModule } from './modules/positions/positions.module';
import { TrialistsModule } from './modules/trialists/trialists.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { StandingsModule } from './modules/standings/standings.module';
import { ScrapingModule } from './modules/scraping/scraping.module';
import { FormationsModule } from './modules/formations/formations.module';
import { ClubSettingsModule } from './modules/club-settings/club-settings.module';
import { EventsModule } from './modules/events/events.module';
import { FinancialModule } from './modules/financial/financial.module';
import { ScheduledJobsModule } from './modules/scheduled-jobs/scheduled-jobs.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    FixturesModule,
    TeamsModule,
    StatsModule,
    PositionsModule,
    TrialistsModule,
    CommunicationModule,
    StandingsModule,
    ScrapingModule,
    FormationsModule,
    ClubSettingsModule,
    EventsModule,
    FinancialModule,
    ScheduledJobsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
