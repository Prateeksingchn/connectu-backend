import { Test, TestingModule } from '@nestjs/testing';
import { MatchingScheduler } from './matching.scheduler';
import { MatchingService } from './matching.service';
import { RedisService } from '../redis/redis.service';
import { ChatRoomRepository } from './repositories/chat-room.repository';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('MatchingScheduler', () => {
  let scheduler: MatchingScheduler;
  let matchingService: Record<string, jest.Mock>;
  let redisService: Record<string, jest.Mock>;
  let chatRoomRepository: Record<string, jest.Mock>;

  beforeEach(async () => {
    matchingService = {
      findBestMatchForUser: jest.fn(),
      expireChatRoom: jest.fn(),
    };
    redisService = { getMatchingQueue: jest.fn() };
    chatRoomRepository = { findExpiredActiveRooms: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingScheduler,
        { provide: MatchingService, useValue: matchingService },
        { provide: RedisService, useValue: redisService },
        { provide: ChatRoomRepository, useValue: chatRoomRepository },
      ],
    }).compile();

    scheduler = module.get<MatchingScheduler>(MatchingScheduler);
  });

  it('should be defined', () => {
    expect(scheduler).toBeDefined();
  });

  describe('processReadyUsers', () => {
    it('skips an overlapping tick while a previous one is still in flight', async () => {
      const gate = deferred<any[]>();
      redisService.getMatchingQueue.mockReturnValueOnce(gate.promise);

      const firstTick = scheduler.processReadyUsers(); // still in flight (queue call unresolved)
      const secondTick = scheduler.processReadyUsers(); // must short-circuit immediately

      await secondTick;
      expect(redisService.getMatchingQueue).toHaveBeenCalledTimes(1);

      gate.resolve([]);
      await firstTick;
    });

    it('allows a later tick to run normally once the previous one has finished', async () => {
      redisService.getMatchingQueue.mockResolvedValueOnce([]);
      await scheduler.processReadyUsers();

      redisService.getMatchingQueue.mockResolvedValueOnce([]);
      await scheduler.processReadyUsers();

      expect(redisService.getMatchingQueue).toHaveBeenCalledTimes(2);
    });

    it('resets the in-progress guard after an error so the next tick is not stuck', async () => {
      redisService.getMatchingQueue.mockRejectedValueOnce(new Error('redis down'));
      await expect(scheduler.processReadyUsers()).resolves.toBeUndefined();

      redisService.getMatchingQueue.mockResolvedValueOnce([]);
      await scheduler.processReadyUsers();

      expect(redisService.getMatchingQueue).toHaveBeenCalledTimes(2);
    });

    it('does nothing when the queue is empty', async () => {
      redisService.getMatchingQueue.mockResolvedValue([]);

      await scheduler.processReadyUsers();

      expect(matchingService.findBestMatchForUser).not.toHaveBeenCalled();
    });

    it('does not attempt a match when fewer than 2 users have waited long enough', async () => {
      const now = Date.now();
      redisService.getMatchingQueue.mockResolvedValue([
        { userId: 'a', interests: [], hobbies: [], techStack: [], score: now }, // just queued
      ]);

      await scheduler.processReadyUsers();

      expect(matchingService.findBestMatchForUser).not.toHaveBeenCalled();
    });

    it('attempts a match once exactly 2 users have waited past the threshold, and stops once they are paired', async () => {
      const readyScore = Date.now() - 3 * 60 * 1000; // waited 3 minutes ago
      const a = { userId: 'a', interests: [], hobbies: [], techStack: [], score: readyScore };
      const b = { userId: 'b', interests: [], hobbies: [], techStack: [], score: readyScore };
      redisService.getMatchingQueue.mockResolvedValue([a, b]);
      matchingService.findBestMatchForUser.mockResolvedValue({
        match: b,
        score: 2,
        roomId: 'room-ab',
      });

      await scheduler.processReadyUsers();

      // b gets marked as processed once matched with a, so the loop's second
      // iteration (user1 = b) is skipped and never re-attempts a match for it.
      expect(matchingService.findBestMatchForUser).toHaveBeenCalledTimes(1);
      expect(matchingService.findBestMatchForUser).toHaveBeenCalledWith(a, [b]);
    });

    it('keeps trying subsequent users in the same tick when an earlier pairing attempt finds no match', async () => {
      const readyScore = Date.now() - 3 * 60 * 1000;
      const a = { userId: 'a', interests: [], hobbies: [], techStack: [], score: readyScore };
      const b = { userId: 'b', interests: [], hobbies: [], techStack: [], score: readyScore };
      redisService.getMatchingQueue.mockResolvedValue([a, b]);
      matchingService.findBestMatchForUser.mockResolvedValue(null);

      await scheduler.processReadyUsers();

      // Neither pairing attempt succeeds, so both a (against [b]) and b (against
      // [a], since a is still unprocessed) get tried within the same tick.
      expect(matchingService.findBestMatchForUser).toHaveBeenCalledTimes(2);
      expect(matchingService.findBestMatchForUser).toHaveBeenNthCalledWith(1, a, [b]);
      expect(matchingService.findBestMatchForUser).toHaveBeenNthCalledWith(2, b, [a]);
    });

    it('marks both members of a match as processed so neither is matched again this tick', async () => {
      const readyScore = Date.now() - 3 * 60 * 1000;
      const a = { userId: 'a', interests: [], hobbies: [], techStack: [], score: readyScore };
      const b = { userId: 'b', interests: [], hobbies: [], techStack: [], score: readyScore };
      const c = { userId: 'c', interests: [], hobbies: [], techStack: [], score: readyScore };
      const d = { userId: 'd', interests: [], hobbies: [], techStack: [], score: readyScore };
      redisService.getMatchingQueue.mockResolvedValue([a, b, c, d]);

      matchingService.findBestMatchForUser.mockImplementation(async (user: any) => {
        if (user.userId === 'a') {
          return { match: b, score: 5, roomId: 'room-ab' };
        }
        if (user.userId === 'c') {
          return { match: d, score: 3, roomId: 'room-cd' };
        }
        return null;
      });

      await scheduler.processReadyUsers();

      expect(matchingService.findBestMatchForUser).toHaveBeenCalledTimes(2);
      expect(matchingService.findBestMatchForUser).toHaveBeenNthCalledWith(1, a, [b, c, d]);
      expect(matchingService.findBestMatchForUser).toHaveBeenNthCalledWith(2, c, [d]);
    });

    it('stops looking for matches once the only remaining ready user has no candidates left', async () => {
      const readyScore = Date.now() - 3 * 60 * 1000;
      const a = { userId: 'a', interests: [], hobbies: [], techStack: [], score: readyScore };
      const b = { userId: 'b', interests: [], hobbies: [], techStack: [], score: readyScore };
      const c = { userId: 'c', interests: [], hobbies: [], techStack: [], score: readyScore };
      redisService.getMatchingQueue.mockResolvedValue([a, b, c]);

      matchingService.findBestMatchForUser.mockImplementation(async (user: any) => {
        if (user.userId === 'a') {
          return { match: b, score: 1, roomId: 'room-ab' };
        }
        return null;
      });

      await scheduler.processReadyUsers();

      // a matched with b, leaving only c with zero remaining candidates -> loop breaks
      expect(matchingService.findBestMatchForUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('expireChatRooms', () => {
    it('skips an overlapping tick while a previous one is still in flight', async () => {
      const gate = deferred<any[]>();
      chatRoomRepository.findExpiredActiveRooms.mockReturnValueOnce(gate.promise);

      const firstTick = scheduler.expireChatRooms();
      const secondTick = scheduler.expireChatRooms();

      await secondTick;
      expect(chatRoomRepository.findExpiredActiveRooms).toHaveBeenCalledTimes(1);

      gate.resolve([]);
      await firstTick;
    });

    it('resets the in-progress guard after an error so the next tick is not stuck', async () => {
      chatRoomRepository.findExpiredActiveRooms.mockRejectedValueOnce(
        new Error('db down'),
      );
      await expect(scheduler.expireChatRooms()).resolves.toBeUndefined();

      chatRoomRepository.findExpiredActiveRooms.mockResolvedValueOnce([]);
      await scheduler.expireChatRooms();

      expect(chatRoomRepository.findExpiredActiveRooms).toHaveBeenCalledTimes(2);
    });

    it('does nothing when there are no expired rooms', async () => {
      chatRoomRepository.findExpiredActiveRooms.mockResolvedValue([]);

      await scheduler.expireChatRooms();

      expect(matchingService.expireChatRoom).not.toHaveBeenCalled();
    });

    it('attempts to expire every room found, even if one fails', async () => {
      chatRoomRepository.findExpiredActiveRooms.mockResolvedValue([
        { id: 'room-1' },
        { id: 'room-2' },
      ]);
      matchingService.expireChatRoom.mockImplementation(async (id: string) => {
        if (id === 'room-1') {
          throw new Error('unexpected failure');
        }
        return true;
      });

      await scheduler.expireChatRooms();

      expect(matchingService.expireChatRoom).toHaveBeenCalledWith('room-1');
      expect(matchingService.expireChatRoom).toHaveBeenCalledWith('room-2');
      expect(matchingService.expireChatRoom).toHaveBeenCalledTimes(2);
    });
  });
});
