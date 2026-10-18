import { Test, TestingModule } from '@nestjs/testing';
import {
  MatchingController,
  statsThrottleTracker,
} from './matching.controller';
import { MatchingService } from './matching.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

describe('MatchingController', () => {
  let controller: MatchingController;
  let service: Record<string, jest.Mock>;

  const user = { id: 'user-1' };

  beforeEach(async () => {
    service = {
      joinQueue: jest.fn(),
      leaveQueue: jest.fn(),
      clearAllUsersFromQueue: jest.fn(),
      endActiveChatRoom: jest.fn(),
      getActiveRoom: jest.fn(),
      getStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchingController],
      providers: [{ provide: MatchingService, useValue: service }],
    }).compile();

    controller = module.get<MatchingController>(MatchingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('joinQueue delegates to the service with the current user id', async () => {
    service.joinQueue.mockResolvedValue({ message: 'Added to matching queue' });

    const result = await controller.joinQueue(user);

    expect(service.joinQueue).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ message: 'Added to matching queue' });
  });

  it('getActiveRoom delegates to the service with the current user id', async () => {
    service.getActiveRoom.mockResolvedValue(null);

    const result = await controller.getActiveRoom(user);

    expect(service.getActiveRoom).toHaveBeenCalledWith('user-1');
    expect(result).toBeNull();
  });

  describe('getStats', () => {
    it('returns the aggregate counts from the service', async () => {
      service.getStats.mockResolvedValue({ usersInQueue: 3, usersOnline: 12 });

      const result = await controller.getStats();

      expect(service.getStats).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ usersInQueue: 3, usersOnline: 12 });
    });

    it('takes no user argument, so it cannot be scoped to (or leak) a caller', async () => {
      service.getStats.mockResolvedValue({ usersInQueue: 0, usersOnline: 0 });

      await controller.getStats();

      expect(service.getStats).toHaveBeenCalledWith();
    });

    it('is JWT-guarded, like every other route on this controller', () => {
      // The guard is declared once at class level, so an unauthenticated
      // caller can never reach the counter.
      const guards = (Reflect.getMetadata('__guards__', MatchingController) ??
        []) as unknown[];

      expect(guards).toContain(JwtAuthGuard);
    });

    it('is rate limited to 30 requests per minute', () => {
      const handler = MatchingController.prototype.getStats;

      expect(Reflect.getMetadata('THROTTLER:LIMITdefault', handler)).toBe(30);
      expect(Reflect.getMetadata('THROTTLER:TTLdefault', handler)).toBe(60_000);
      expect(Reflect.getMetadata('THROTTLER:TRACKERdefault', handler)).toBe(
        statsThrottleTracker,
      );
    });

    it('throttles per session (token hash), falling back to IP without one', () => {
      const a = statsThrottleTracker({
        headers: { authorization: 'Bearer aaa' },
        ip: '1.1.1.1',
      });
      const b = statsThrottleTracker({
        headers: { authorization: 'Bearer bbb' },
        ip: '1.1.1.1',
      });

      expect(a).not.toBe(b);
      expect(a).not.toContain('aaa'); // raw token never used as a key
      expect(statsThrottleTracker({ headers: {}, ip: '1.1.1.1' })).toBe(
        'ip:1.1.1.1',
      );
    });

    it('exposes counts only - never user identities', async () => {
      service.getStats.mockResolvedValue({ usersInQueue: 2, usersOnline: 5 });

      const result = await controller.getStats();

      expect(Object.keys(result).sort()).toEqual([
        'usersInQueue',
        'usersOnline',
      ]);
      expect(Object.values(result).every((v) => typeof v === 'number')).toBe(
        true,
      );
    });
  });
});
