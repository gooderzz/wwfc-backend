import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any;
    guard = new RolesGuard(reflector);
  });

  function createContext(user: any = {}) {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as any;
  }

  it('allows access if no roles are required', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    const context = createContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access for manager role', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['MANAGER']);
    const context = createContext({ role: 'MANAGER' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('blocks access for non-manager role', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['MANAGER']);
    const context = createContext({ role: 'PLAYER' });
    expect(() => guard.canActivate(context)).toThrow();
  });
});
