export interface Formation {
  id: string;
  version: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  positions: FormationPosition[];
}

export interface FormationPosition {
  id: string;
  formationId: string;
  name: string;
  category: PositionCategory;
  displayOrder: number;
  isDefensive: boolean;
  createdAt: Date;
}

import { PositionCategory as PrismaPositionCategory } from '@prisma/client';

export type PositionCategory = PrismaPositionCategory;

export interface FormationStats {
  id: number;
  teamId: number;
  formationId: string;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  lastUpdated: Date;
  formation?: Formation;
}

export interface FormationStatsWithCalculated {
  formationId: string;
  formationName: string;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  winRate: number;
  avgGoalsScored: number;
  avgGoalsConceded: number;
}

export interface TeamSelectionWithFormation {
  id: string;
  fixtureId: number;
  formationId: string;
  version: number;
  starting11: any; // JsonValue from Prisma
  substitutes: any; // JsonValue from Prisma
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  formation: Formation;
}

export interface FormationChangeRequest {
  formationId: string;
  resetTeamSelection?: boolean;
}

export interface FormationSelectorResponse {
  formations: Formation[];
  stats?: FormationStatsWithCalculated[];
}

export interface FormationPositionMapping {
  [positionId: string]: number | null; // positionId -> playerId
}

export interface FormationTeamSelection {
  formationId: string;
  starting11: FormationPositionMapping;
  substitutes: number[];
  version: number;
}
