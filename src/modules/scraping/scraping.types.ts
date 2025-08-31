export interface Division {
  id: string;
  name: string;
  leagueId: string;
  isActive: boolean;
  teamCount?: number;
  lastScraped?: Date;
}

export interface Season {
  id: string;
  name: string;
  isLive: boolean; // Only one season should be live at a time
  leagueId: string;
  startDate?: Date;
  endDate?: Date;
  year: number;
  isAdminOverride?: boolean; // Indicates if admin manually set this as live
}

export interface LeagueTableEntry {
  position: number;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form?: string[]; // Last 5 results: ['W', 'D', 'L', 'W', 'W']
}

export interface ScrapingResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
  divisionId?: string;
  seasonId?: string;
  teamsFound?: number;
  processingTime?: number;
}

export interface DiscoveryResult {
  divisions: Division[];
  seasons: Season[];
  currentSeason?: Season;
  lastUpdated: Date;
  success: boolean;
  error?: string;
}

export interface ScrapingStatus {
  isRunning: boolean;
  lastRun?: Date;
  nextRun?: Date;
  safeMode: boolean;
  totalDivisions: number;
  totalSeasons: number;
  currentSeason?: Season;
  errors: string[];
}

export enum ScrapingStatusEnum {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS',
  FAILED = 'FAILED',
  RETRY_PENDING = 'RETRY_PENDING',
}

export enum ScrapingTypeEnum {
  DISCOVERY = 'DISCOVERY',
  LEAGUE_TABLE = 'LEAGUE_TABLE',
  DIVISION_SEASONS = 'DIVISION_SEASONS',
  FULL_UPDATE = 'FULL_UPDATE',
}

export interface ScrapingLogEntry {
  id: number;
  type: ScrapingTypeEnum;
  status: ScrapingStatusEnum;
  divisionId?: string;
  seasonId?: string;
  leagueId: string;
  startedAt: Date;
  completedAt?: Date;
  processingTime?: number;
  teamsFound: number;
  teamsCreated: number;
  teamsUpdated: number;
  teamsSkipped: number;
  errors: string[];
  warnings: string[];
  retryCount: number;
  maxRetries: number;
  lastRetryAt?: Date;
  nextRetryAt?: Date;
  initiatedBy?: {
    id: number;
    name: string;
    email: string;
  };
  metadata?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
