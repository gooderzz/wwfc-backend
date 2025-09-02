import { Test, TestingModule } from '@nestjs/testing';
import { FAFullTimeScraperService } from './fa-fulltime-scraper.service';
import { PrismaService } from '../../prisma.service';
import { TeamIdentityService } from '../teams/team-identity.service';
import { BrowserServiceFactory } from './browser-services/browser-service.factory';
import { LocalPuppeteerService } from './browser-services/local-puppeteer.service';

// Mock the browser service
const mockBrowserService = {
  launch: jest.fn(),
  close: jest.fn(),
  getPage: jest.fn(),
  isAvailable: jest.fn().mockReturnValue(true),
};

const mockBrowserServiceFactory = {
  create: jest.fn().mockReturnValue(mockBrowserService),
};

describe('FAFullTimeScraperService - Fallback Functionality', () => {
  let service: FAFullTimeScraperService;
  let prismaService: PrismaService;
  let teamIdentityService: TeamIdentityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FAFullTimeScraperService,
        {
          provide: PrismaService,
          useValue: {
            scrapedTeam: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: TeamIdentityService,
          useValue: {
            // Add mock methods as needed
          },
        },
        {
          provide: BrowserServiceFactory,
          useValue: mockBrowserServiceFactory,
        },
      ],
    }).compile();

    service = module.get<FAFullTimeScraperService>(FAFullTimeScraperService);
    prismaService = module.get<PrismaService>(PrismaService);
    teamIdentityService = module.get<TeamIdentityService>(TeamIdentityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Fallback Data Methods', () => {
    describe('getCachedDivisions', () => {
      it('should return cached divisions from database', async () => {
        const mockDivisions = [
          { divisionId: 'div1', division: 'Division 1', seasonId: 'season1' },
          { divisionId: 'div2', division: 'Division 2', seasonId: 'season1' },
        ];

        jest.spyOn(prismaService.scrapedTeam, 'findFirst').mockResolvedValue({
          seasonId: 'season1',
        } as any);

        jest.spyOn(prismaService.scrapedTeam, 'findMany').mockResolvedValue(
          mockDivisions as any
        );

        const result = await (service as any).getCachedDivisions();

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          id: 'div1',
          name: 'Division 1',
          leagueId: '3545957', // defaultLeagueId
          isActive: true,
        });
      });

      it('should return empty array when no cached data found', async () => {
        jest.spyOn(prismaService.scrapedTeam, 'findFirst').mockResolvedValue(null);

        const result = await (service as any).getCachedDivisions();

        expect(result).toEqual([]);
      });
    });

    describe('getCachedSeasons', () => {
      it('should return cached seasons from database', async () => {
        const mockSeasons = [
          { seasonId: 'season1' },
          { seasonId: 'season2' },
        ];

        jest.spyOn(prismaService.scrapedTeam, 'findMany').mockResolvedValue(
          mockSeasons as any
        );

        const result = await (service as any).getCachedSeasons();

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          id: 'season1',
          name: 'Season season1',
          year: new Date().getFullYear(),
          isLive: false,
          leagueId: '3545957', // defaultLeagueId
        });
      });
    });
  });

  describe('Fallback Method Integration', () => {
    describe('discoverDivisionsWithFallback', () => {
      it('should return scraped data when successful', async () => {
        const mockDivisions = [
          { id: 'div1', name: 'Division 1', leagueId: 'league1', isActive: true },
        ];

        jest.spyOn(service, 'discoverDivisions').mockResolvedValue(mockDivisions);

        const result = await service.discoverDivisionsWithFallback();

        expect(result).toEqual(mockDivisions);
      });

      it('should return cached data when scraping fails', async () => {
        const mockCachedDivisions = [
          { id: 'div1', name: 'Division 1', leagueId: '3545957', isActive: true },
        ];

        jest.spyOn(service, 'discoverDivisions').mockRejectedValue(
          new Error('Scraping failed')
        );

        jest.spyOn(service as any, 'getCachedDivisions').mockResolvedValue(
          mockCachedDivisions
        );

        const result = await service.discoverDivisionsWithFallback();

        expect(result).toEqual(mockCachedDivisions);
      });
    });

    describe('discoverSeasonsWithFallback', () => {
      it('should return scraped data when successful', async () => {
        const mockSeasons = [
          { id: 'season1', name: 'Season 1', isLive: true, leagueId: 'league1', year: 2024 },
        ];

        jest.spyOn(service, 'discoverSeasons').mockResolvedValue(mockSeasons);

        const result = await service.discoverSeasonsWithFallback();

        expect(result).toEqual(mockSeasons);
      });

      it('should return cached data when scraping fails', async () => {
        const mockCachedSeasons = [
          { id: 'season1', name: 'Season season1', isLive: false, leagueId: '3545957', year: 2024 },
        ];

        jest.spyOn(service, 'discoverSeasons').mockRejectedValue(
          new Error('Scraping failed')
        );

        jest.spyOn(service as any, 'getCachedSeasons').mockResolvedValue(
          mockCachedSeasons
        );

        const result = await service.discoverSeasonsWithFallback();

        expect(result).toEqual(mockCachedSeasons);
      });
    });

    describe('discoverAllWithFallback', () => {
      it('should return scraped data when successful', async () => {
        const mockDiscovery = {
          divisions: [{ id: 'div1', name: 'Division 1', leagueId: 'league1', isActive: true }],
          seasons: [{ id: 'season1', name: 'Season 1', isLive: true, leagueId: 'league1', year: 2024 }],
          lastUpdated: new Date(),
          success: true,
        };

        jest.spyOn(service, 'discoverAll').mockResolvedValue(mockDiscovery);

        const result = await service.discoverAllWithFallback();

        expect(result).toEqual(mockDiscovery);
      });

      it('should return cached data when scraping fails', async () => {
        const mockCachedDivisions = [
          { id: 'div1', name: 'Division 1', leagueId: '3545957', isActive: true },
        ];
        const mockCachedSeasons = [
          { id: 'season1', name: 'Season season1', isLive: false, leagueId: '3545957', year: 2024 },
        ];

        jest.spyOn(service, 'discoverAll').mockRejectedValue(
          new Error('Scraping failed')
        );

        jest.spyOn(service as any, 'getCachedDivisions').mockResolvedValue(
          mockCachedDivisions
        );
        jest.spyOn(service as any, 'getCachedSeasons').mockResolvedValue(
          mockCachedSeasons
        );

        const result = await service.discoverAllWithFallback();

        expect(result).toEqual({
          divisions: mockCachedDivisions,
          seasons: mockCachedSeasons,
          lastUpdated: expect.any(Date),
          success: false,
          error: expect.stringContaining('Using cached data due to scraping failure'),
        });
      });
    });
  });
});
