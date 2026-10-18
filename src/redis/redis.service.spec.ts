import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    configService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    // Intentionally NOT calling module.init() / onModuleInit() here - this keeps
    // `client` null so the "never initialized" tests exercise the real code path,
    // and lets the "connection error mid-call" tests inject a controlled fake
    // client instead of standing up a real ioredis connection.
    service = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('when the Redis client was never initialized (onModuleInit never ran or failed)', () => {
    it('removeFromMatchingQueue rejects instead of resolving silently', async () => {
      await expect(service.removeFromMatchingQueue(['user-1'])).rejects.toThrow(
        'Redis client not initialized',
      );
    });

    it('removeUserRoom rejects instead of resolving silently', async () => {
      await expect(service.removeUserRoom('user-1')).rejects.toThrow(
        'Redis client not initialized',
      );
    });
  });

  describe('when the underlying Redis connection fails mid-call', () => {
    let mockClient: Record<string, jest.Mock>;

    beforeEach(() => {
      mockClient = {
        zrange: jest.fn(),
        zrem: jest.fn(),
        del: jest.fn(),
      };
      // Inject the fake client directly into the same private field
      // onModuleInit() would otherwise have populated via `new Redis(url)`.
      (service as any).client = mockClient;
    });

    it('removeFromMatchingQueue propagates a connection error rather than swallowing it', async () => {
      mockClient.zrange.mockRejectedValue(new Error('Connection is closed.'));

      await expect(service.removeFromMatchingQueue(['user-1'])).rejects.toThrow(
        'Connection is closed.',
      );
    });

    it('removeUserRoom propagates a connection error rather than swallowing it', async () => {
      mockClient.del.mockRejectedValue(new Error('Connection is closed.'));

      await expect(service.removeUserRoom('user-1')).rejects.toThrow(
        'Connection is closed.',
      );
    });

    it('removeFromMatchingQueue only removes the requested users on the happy path (contrast case)', async () => {
      mockClient.zrange.mockResolvedValue([
        JSON.stringify({ userId: 'user-1' }),
        JSON.stringify({ userId: 'user-2' }),
      ]);
      mockClient.zrem.mockResolvedValue(1);

      await service.removeFromMatchingQueue(['user-1']);

      expect(mockClient.zrem).toHaveBeenCalledWith(
        'matching:queue',
        JSON.stringify({ userId: 'user-1' }),
      );
      expect(mockClient.zrem).toHaveBeenCalledTimes(1);
    });

    it('removeUserRoom deletes the correct per-user key on the happy path (contrast case)', async () => {
      mockClient.del.mockResolvedValue(1);

      await service.removeUserRoom('user-1');

      expect(mockClient.del).toHaveBeenCalledWith('user:room:user-1');
    });
  });

  describe('why users.service.ts needs its own try/catch around these calls', () => {
    it('a caller with no try/catch of its own would see the rejection bubble all the way up uncaught', async () => {
      // No client injected: simulates Redis being unreachable at call time,
      // i.e. exactly the state that would otherwise abort user deletion
      // (see users.service.ts's remove()) if it weren't caught there.
      await expect(
        (async () => {
          // No try/catch here on purpose - proves the rejection isn't swallowed
          // anywhere inside RedisService itself.
          await service.removeFromMatchingQueue(['user-1']);
        })(),
      ).rejects.toThrow('Redis client not initialized');
    });
  });
});
