import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: any;
  let jwtService: any;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock.jwt.token'),
    };
    authService = new AuthService(prisma, jwtService);
  });

  it('registers a new user and hashes password', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(async ({ data }: any) => ({
      ...data,
      id: 1,
    }));
    // @ts-expect-error
    const hashSpy = jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedpw');
    const result = await authService.register({
      name: 'Test',
      email: 'test@example.com',
      password: 'pw12345',
    });
    expect(hashSpy).toHaveBeenCalledWith('pw12345', 10);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ passwordHash: 'hashedpw' }),
      }),
    );
    expect(result).toMatchObject({
      id: 1,
      name: 'Test',
      email: 'test@example.com',
      role: 'PLAYER',
    });
  });

  it('logs in with valid credentials and returns JWT', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      passwordHash: 'hashedpw',
      role: 'PLAYER',
    });
    // @ts-expect-error
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    const result = await authService.login({
      email: 'test@example.com',
      password: 'pw12345',
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 1,
        email: 'test@example.com',
        role: 'PLAYER',
      }),
    );
    expect(result).toEqual({ access_token: 'mock.jwt.token' });
  });

  it('throws on invalid login (wrong password)', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      passwordHash: 'hashedpw',
      role: 'PLAYER',
    });
    // @ts-expect-error
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
    await expect(
      authService.login({ email: 'test@example.com', password: 'badpw' }),
    ).rejects.toThrow();
  });

  it('throws on invalid login (no user)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      authService.login({ email: 'nouser@example.com', password: 'pw12345' }),
    ).rejects.toThrow();
  });
});
