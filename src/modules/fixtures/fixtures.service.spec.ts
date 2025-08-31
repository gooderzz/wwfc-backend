import { FixturesService } from './fixtures.service';
import { PrismaService } from '../../prisma.service';
import { RSVPStatus } from '@prisma/client';
import { UpdateResultDto } from './dto/update-result.dto';
import { PlayerStatsDto } from './dto/player-stats.dto';

describe('FixturesService', () => {
  let fixturesService: FixturesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      fixture: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      fixtureRSVP: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      playerStats: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    fixturesService = new FixturesService(prisma);
  });

  it('allows manager to create fixture', async () => {
    prisma.fixture.create.mockResolvedValue({
      id: 1,
      opponent: 'Rivals',
      teamId: 1,
    });
    const result = await fixturesService.createFixture(
      1,
      'Rivals',
      new Date(),
      { role: 'MANAGER' },
    );
    expect(result).toMatchObject({ id: 1, opponent: 'Rivals', teamId: 1 });
  });

  it('blocks non-manager from creating fixture', async () => {
    await expect(
      fixturesService.createFixture(1, 'Rivals', new Date(), {
        role: 'PLAYER',
      }),
    ).rejects.toThrow();
  });

  it('adds RSVP (unique per user/fixture)', async () => {
    prisma.fixtureRSVP.upsert.mockResolvedValue({
      id: 'rsvpid',
      userId: 1,
      fixtureId: 2,
      status: RSVPStatus.YES,
    });
    const result = await fixturesService.addRSVP(2, 1, RSVPStatus.YES);
    expect(result).toMatchObject({
      userId: 1,
      fixtureId: 2,
      status: RSVPStatus.YES,
    });
  });

  it('throws on RSVP to nonexistent fixture', async () => {
    prisma.fixtureRSVP.upsert.mockRejectedValue(new Error('Fixture not found'));
    await expect(
      fixturesService.addRSVP(999, 1, RSVPStatus.YES),
    ).rejects.toThrow();
  });

  it('allows manager to patch result', async () => {
    prisma.fixture.findUnique.mockResolvedValue({ id: 1, teamId: 2 });
    prisma.fixture.update.mockResolvedValue({
      id: 1,
      homeGoals: 2,
      awayGoals: 1,
      isPlayed: true,
    });
    const result = await fixturesService.updateResult(
      1,
      { role: 'MANAGER', teamId: 2 },
      { homeGoals: 2, awayGoals: 1 },
    );
    expect(result).toMatchObject({
      homeGoals: 2,
      awayGoals: 1,
      isPlayed: true,
    });
  });

  it('blocks non-manager from patching result', async () => {
    prisma.fixture.findUnique.mockResolvedValue({ id: 1, teamId: 2 });
    await expect(
      fixturesService.updateResult(
        1,
        { role: 'PLAYER', teamId: 2 },
        { homeGoals: 2, awayGoals: 1 },
      ),
    ).rejects.toThrow();
  });

  it('blocks manager of wrong team from patching result', async () => {
    prisma.fixture.findUnique.mockResolvedValue({ id: 1, teamId: 2 });
    await expect(
      fixturesService.updateResult(
        1,
        { role: 'MANAGER', teamId: 3 },
        { homeGoals: 2, awayGoals: 1 },
      ),
    ).rejects.toThrow();
  });

  it('allows manager to submit player stats', async () => {
    prisma.fixture.findUnique.mockResolvedValue({ id: 1, teamId: 2 });
    prisma.playerStats.findUnique.mockResolvedValue(null);
    prisma.playerStats.create.mockResolvedValue({
      id: 'statid',
      userId: 5,
      fixtureId: 1,
      goals: 2,
      assists: 1,
    });
    const stats: PlayerStatsDto[] = [{ userId: 5, goals: 2, assists: 1 }];
    const result = await fixturesService.submitPlayerStats(
      1,
      { role: 'MANAGER', teamId: 2 },
      stats,
    );
    expect(result[0]).toMatchObject({
      userId: 5,
      fixtureId: 1,
      goals: 2,
      assists: 1,
    });
  });

  it('blocks duplicate player stats', async () => {
    prisma.fixture.findUnique.mockResolvedValue({ id: 1, teamId: 2 });
    prisma.playerStats.findUnique.mockResolvedValueOnce({ id: 'statid' });
    const stats: PlayerStatsDto[] = [{ userId: 5, goals: 2, assists: 1 }];
    await expect(
      fixturesService.submitPlayerStats(
        1,
        { role: 'MANAGER', teamId: 2 },
        stats,
      ),
    ).rejects.toThrow();
  });

  it('blocks non-manager from submitting stats', async () => {
    prisma.fixture.findUnique.mockResolvedValue({ id: 1, teamId: 2 });
    const stats: PlayerStatsDto[] = [{ userId: 5, goals: 2, assists: 1 }];
    await expect(
      fixturesService.submitPlayerStats(
        1,
        { role: 'PLAYER', teamId: 2 },
        stats,
      ),
    ).rejects.toThrow();
  });
});
