import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { RedisService } from '../redis/redis.service';
import { UsersRepository } from '../users/users.repository';
import { ChatRoomRepository } from './repositories/chat-room.repository';
import { AlgorithmService } from './algorithm.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { WebSocketEvent } from '../websocket/events/websocket.events';
import { AnonymousIdentityService } from '../websocket/services/anonymous-identity.service';

describe('MatchingService', () => {
  let service: MatchingService;
  let redisService: Record<string, jest.Mock>;
  let usersRepository: Record<string, jest.Mock>;
  let chatRoomRepository: Record<string, jest.Mock>;
  let algorithmService: Record<string, jest.Mock>;
  let wsGateway: Record<string, jest.Mock>;
  let anonymousIdentityService: Record<string, jest.Mock>;

  beforeEach(async () => {
    redisService = {
      isInMatchingQueue: jest.fn(),
      addToMatchingQueue: jest.fn(),
      getQueueSize: jest.fn(),
      getMatchingQueue: jest.fn(),
      removeFromMatchingQueue: jest.fn(),
      setActiveRoom: jest.fn(),
      setUserRoom: jest.fn(),
      removeUserRoom: jest.fn(),
      deleteActiveRoom: jest.fn(),
      clearMatchingQueue: jest.fn(),
    };
    usersRepository = { findById: jest.fn() };
    chatRoomRepository = {
      findActiveByUserId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      endActiveChatRoom: jest.fn(),
      expireRoom: jest.fn(),
    };
    algorithmService = { findBestMatch: jest.fn() };
    wsGateway = {
      emitToUser: jest.fn().mockReturnValue(true),
      emitToRoom: jest.fn(),
      getRoomMembers: jest.fn(),
      getUserSocketId: jest.fn(),
      getServer: jest.fn(),
      removeRoomMembership: jest.fn(),
      getOnlineUserCount: jest.fn().mockReturnValue(0),
    };
    anonymousIdentityService = {
      clearRoomIdentities: jest.fn(),
      assignAnonymousName: jest.fn((_roomId: string, userId: string) =>
        userId === 'user-1' ? 'CalmOtter' : 'WittyPenguin',
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        { provide: RedisService, useValue: redisService },
        { provide: UsersRepository, useValue: usersRepository },
        { provide: ChatRoomRepository, useValue: chatRoomRepository },
        { provide: AlgorithmService, useValue: algorithmService },
        { provide: WebSocketGateway, useValue: wsGateway },
        {
          provide: AnonymousIdentityService,
          useValue: anonymousIdentityService,
        },
      ],
    }).compile();

    service = module.get<MatchingService>(MatchingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('joinQueue', () => {
    const userId = 'user-1';
    const user = {
      id: userId,
      interests: [{ id: 1 }],
      hobbies: [{ id: 2 }],
      techStack: [{ id: 3 }],
    };

    it('rejects when the user is already in the matching queue', async () => {
      redisService.isInMatchingQueue.mockResolvedValue(true);

      await expect(service.joinQueue(userId)).rejects.toThrow(
        ConflictException,
      );
      expect(chatRoomRepository.findActiveByUserId).not.toHaveBeenCalled();
    });

    it('rejects when the user already has an active chat room', async () => {
      redisService.isInMatchingQueue.mockResolvedValue(false);
      chatRoomRepository.findActiveByUserId.mockResolvedValue({
        id: 'room-1',
        isActive: true,
      });

      await expect(service.joinQueue(userId)).rejects.toThrow(
        ConflictException,
      );
      expect(redisService.addToMatchingQueue).not.toHaveBeenCalled();
    });

    // Expiry-awareness for "is this user's room still active" now lives entirely
    // in ChatRoomRepository.findActiveByUserId() itself (see
    // matching/repositories/chat-room.repository.spec.ts) - it self-heals a stale
    // isActive flag before ever returning a room, so joinQueue() can just trust a
    // non-null result unconditionally. No expiry-boundary test needed here anymore.

    it('rejects when the user does not exist', async () => {
      redisService.isInMatchingQueue.mockResolvedValue(false);
      chatRoomRepository.findActiveByUserId.mockResolvedValue(null);
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.joinQueue(userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('adds the user to the queue with their profile data on the happy path', async () => {
      redisService.isInMatchingQueue.mockResolvedValue(false);
      chatRoomRepository.findActiveByUserId.mockResolvedValue(null);
      usersRepository.findById.mockResolvedValue(user);
      redisService.getQueueSize.mockResolvedValue(3);

      const result = await service.joinQueue(userId);

      expect(redisService.addToMatchingQueue).toHaveBeenCalledWith(userId, {
        userId,
        interests: [1],
        hobbies: [2],
        techStack: [3],
      });
      expect(result).toEqual({
        message:
          'Added to matching queue. Finding best match... (may take up to 2 minutes)',
        queueSize: 3,
        estimatedWaitTime: '2 minutes',
      });
    });
  });

  describe('leaveQueue', () => {
    it('rejects when the user is not in the queue', async () => {
      redisService.isInMatchingQueue.mockResolvedValue(false);

      await expect(service.leaveQueue('user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(redisService.removeFromMatchingQueue).not.toHaveBeenCalled();
    });

    it('removes the user from the queue when they are in it', async () => {
      redisService.isInMatchingQueue.mockResolvedValue(true);

      const result = await service.leaveQueue('user-1');

      expect(redisService.removeFromMatchingQueue).toHaveBeenCalledWith([
        'user-1',
      ]);
      expect(result).toEqual({ message: 'Left matching queue successfully' });
    });
  });

  describe('findBestMatchForUser (createMatch)', () => {
    const user = {
      userId: 'user-1',
      interests: [1],
      hobbies: [2],
      techStack: [3],
    };
    const candidate = {
      userId: 'user-2',
      interests: [1],
      hobbies: [],
      techStack: [],
      score: 0,
    };

    it('returns null when there are no candidates', async () => {
      const result = await service.findBestMatchForUser(user, []);

      expect(result).toBeNull();
      expect(chatRoomRepository.create).not.toHaveBeenCalled();
    });

    it('returns null when the algorithm finds no best match', async () => {
      algorithmService.findBestMatch.mockReturnValue(null);

      const result = await service.findBestMatchForUser(user, [candidate]);

      expect(result).toBeNull();
      expect(chatRoomRepository.create).not.toHaveBeenCalled();
    });

    it('creates a chat room, tracks it in Redis, and notifies both users on a match', async () => {
      algorithmService.findBestMatch.mockReturnValue({
        match: { userId: 'user-2', interests: [1], hobbies: [], techStack: [] },
        score: 1,
      });
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      chatRoomRepository.create.mockResolvedValue({
        id: 'room-1',
        expiresAt,
      });

      const result = await service.findBestMatchForUser(user, [candidate]);

      expect(redisService.removeFromMatchingQueue).toHaveBeenCalledWith([
        'user-1',
        'user-2',
      ]);
      expect(chatRoomRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user1Id: 'user-1',
          user2Id: 'user-2',
          matchScore: 1,
          isActive: true,
        }),
      );
      expect(redisService.setActiveRoom).toHaveBeenCalledWith(
        'room-1',
        expect.objectContaining({ user1Id: 'user-1', user2Id: 'user-2' }),
        600,
      );
      expect(redisService.setUserRoom).toHaveBeenCalledWith(
        'user-1',
        'room-1',
        600,
      );
      expect(redisService.setUserRoom).toHaveBeenCalledWith(
        'user-2',
        'room-1',
        600,
      );
      expect(wsGateway.emitToUser).toHaveBeenCalledWith(
        'user-1',
        WebSocketEvent.MATCH_FOUND,
        expect.objectContaining({ roomId: 'room-1' }),
      );
      expect(wsGateway.emitToUser).toHaveBeenCalledWith(
        'user-2',
        WebSocketEvent.MATCH_FOUND,
        expect.objectContaining({ roomId: 'room-1' }),
      );
      expect(result).toEqual({
        score: 1,
        match: { userId: 'user-2', interests: [1], hobbies: [], techStack: [] },
        roomId: 'room-1',
      });
    });

    it('assigns both pseudonyms up front and tells each user who they matched with', async () => {
      algorithmService.findBestMatch.mockReturnValue({
        match: { userId: 'user-2', interests: [1], hobbies: [], techStack: [] },
        score: 1,
      });
      chatRoomRepository.create.mockResolvedValue({
        id: 'room-1',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      await service.findBestMatchForUser(user, [candidate]);

      expect(anonymousIdentityService.assignAnonymousName).toHaveBeenCalledWith(
        'room-1',
        'user-1',
      );
      expect(anonymousIdentityService.assignAnonymousName).toHaveBeenCalledWith(
        'room-1',
        'user-2',
      );
      expect(wsGateway.emitToUser).toHaveBeenCalledWith(
        'user-1',
        WebSocketEvent.MATCH_FOUND,
        expect.objectContaining({
          anonymousName: 'CalmOtter',
          otherAnonymousName: 'WittyPenguin',
        }),
      );
      expect(wsGateway.emitToUser).toHaveBeenCalledWith(
        'user-2',
        WebSocketEvent.MATCH_FOUND,
        expect.objectContaining({
          anonymousName: 'WittyPenguin',
          otherAnonymousName: 'CalmOtter',
        }),
      );
    });

    it('MATCH_FOUND carries no real user id for either side', async () => {
      algorithmService.findBestMatch.mockReturnValue({
        match: { userId: 'user-2', interests: [1], hobbies: [], techStack: [] },
        score: 1,
      });
      chatRoomRepository.create.mockResolvedValue({
        id: 'room-1',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      await service.findBestMatchForUser(user, [candidate]);

      const payloads = wsGateway.emitToUser.mock.calls
        .filter(([, event]) => event === WebSocketEvent.MATCH_FOUND)
        .map(([, , data]) => data as Record<string, unknown>);
      expect(payloads).toHaveLength(2);
      for (const payload of payloads) {
        expect(payload).not.toHaveProperty('otherUserId');
        const serialized = JSON.stringify(payload);
        expect(serialized).not.toContain('user-1');
        expect(serialized).not.toContain('user-2');
      }
    });
  });

  describe('getStats', () => {
    it("reports the Redis queue size and the gateway's live connection count", async () => {
      redisService.getQueueSize.mockResolvedValue(3);
      wsGateway.getOnlineUserCount.mockReturnValue(12);

      expect(await service.getStats()).toEqual({
        usersInQueue: 3,
        usersOnline: 12,
      });
    });

    it('returns zeroes when nobody is queued or connected', async () => {
      redisService.getQueueSize.mockResolvedValue(0);
      wsGateway.getOnlineUserCount.mockReturnValue(0);

      expect(await service.getStats()).toEqual({
        usersInQueue: 0,
        usersOnline: 0,
      });
    });

    it('returns counts only, never the queued users themselves', async () => {
      redisService.getQueueSize.mockResolvedValue(2);
      wsGateway.getOnlineUserCount.mockReturnValue(5);

      const stats = await service.getStats();

      expect(Object.keys(stats).sort()).toEqual([
        'usersInQueue',
        'usersOnline',
      ]);
      // getMatchingQueue() would hand back user ids and profile data; the
      // counter must never reach for it.
      expect(redisService.getMatchingQueue).not.toHaveBeenCalled();
    });
  });

  describe('endActiveChatRoom', () => {
    it('throws when the room does not exist', async () => {
      chatRoomRepository.findById.mockResolvedValue(null);

      await expect(
        service.endActiveChatRoom('room-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when the caller is not a participant in the room', async () => {
      chatRoomRepository.findById.mockResolvedValue({
        id: 'room-1',
        user1Id: 'user-2',
        user2Id: 'user-3',
      });

      await expect(
        service.endActiveChatRoom('room-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(chatRoomRepository.endActiveChatRoom).not.toHaveBeenCalled();
    });

    it('ends the room and clears Redis tracking for a valid participant', async () => {
      chatRoomRepository.findById.mockResolvedValue({
        id: 'room-1',
        user1Id: 'user-1',
        user2Id: 'user-2',
      });

      const result = await service.endActiveChatRoom('room-1', 'user-1');

      expect(chatRoomRepository.endActiveChatRoom).toHaveBeenCalledWith(
        'room-1',
        'user-1',
        'user-2',
      );
      expect(redisService.removeUserRoom).toHaveBeenCalledWith('user-1');
      expect(redisService.removeUserRoom).toHaveBeenCalledWith('user-2');
      expect(redisService.deleteActiveRoom).toHaveBeenCalledWith('room-1');
      // Pseudonyms survive leave/disconnect, so ending the room releases them.
      expect(anonymousIdentityService.clearRoomIdentities).toHaveBeenCalledWith(
        'room-1',
      );
      expect(result).toEqual({ message: 'Chat room ended successfully' });
    });
  });

  describe('expireChatRoom', () => {
    it('returns false when the room does not exist', async () => {
      chatRoomRepository.findById.mockResolvedValue(null);

      expect(await service.expireChatRoom('room-1')).toBe(false);
    });

    it('returns false (idempotent) when the room is already inactive', async () => {
      chatRoomRepository.findById.mockResolvedValue({
        id: 'room-1',
        isActive: false,
      });

      expect(await service.expireChatRoom('room-1')).toBe(false);
      expect(chatRoomRepository.expireRoom).not.toHaveBeenCalled();
    });

    it('returns false when expireRoom() loses the idempotent race (already flipped by another caller)', async () => {
      chatRoomRepository.findById.mockResolvedValue({
        id: 'room-1',
        isActive: true,
        user1Id: 'user-1',
        user2Id: 'user-2',
      });
      chatRoomRepository.expireRoom.mockResolvedValue(false);

      expect(await service.expireChatRoom('room-1')).toBe(false);
      expect(redisService.removeUserRoom).not.toHaveBeenCalled();
    });

    it('cleans up Redis, disconnects sockets from the room, and notifies participants on success', async () => {
      chatRoomRepository.findById.mockResolvedValue({
        id: 'room-1',
        isActive: true,
        user1Id: 'user-1',
        user2Id: 'user-2',
      });
      chatRoomRepository.expireRoom.mockResolvedValue(true);
      wsGateway.getRoomMembers.mockReturnValue(new Set(['user-1', 'user-2']));
      wsGateway.getUserSocketId.mockImplementation((userId: string) =>
        userId === 'user-1' ? 'socket-1' : undefined,
      );
      const socketLeave = jest.fn();
      // `server.sockets` is already the Map<SocketId, Socket> for the default
      // namespace (see WebSocketGateway.disconnectUser()'s comment on the same
      // point) - not a further-nested `server.sockets.sockets`.
      wsGateway.getServer.mockReturnValue({
        sockets: new Map([['socket-1', { leave: socketLeave }]]),
      });

      const result = await service.expireChatRoom('room-1');

      expect(redisService.removeUserRoom).toHaveBeenCalledWith('user-1');
      expect(redisService.removeUserRoom).toHaveBeenCalledWith('user-2');
      expect(redisService.deleteActiveRoom).toHaveBeenCalledWith('room-1');
      expect(socketLeave).toHaveBeenCalledWith('room-1');
      expect(wsGateway.removeRoomMembership).toHaveBeenCalledWith('room-1');
      expect(anonymousIdentityService.clearRoomIdentities).toHaveBeenCalledWith(
        'room-1',
      );
      expect(wsGateway.emitToRoom).toHaveBeenCalledWith(
        'room-1',
        WebSocketEvent.CHAT_EXPIRED,
        expect.any(Object),
      );
      expect(wsGateway.emitToUser).toHaveBeenCalledWith(
        'user-1',
        WebSocketEvent.CHAT_EXPIRED,
        expect.any(Object),
      );
      expect(wsGateway.emitToUser).toHaveBeenCalledWith(
        'user-2',
        WebSocketEvent.CHAT_EXPIRED,
        expect.any(Object),
      );
      expect(result).toBe(true);
    });
  });

  describe('isRoomActive', () => {
    it('returns false when the room does not exist', async () => {
      chatRoomRepository.findById.mockResolvedValue(null);

      expect(await service.isRoomActive('room-1')).toBe(false);
    });

    it('returns false when the room is marked inactive', async () => {
      chatRoomRepository.findById.mockResolvedValue({
        id: 'room-1',
        isActive: false,
      });

      expect(await service.isRoomActive('room-1')).toBe(false);
    });

    it('returns true for an active, unexpired room', async () => {
      chatRoomRepository.findById.mockResolvedValue({
        id: 'room-1',
        isActive: true,
        expiresAt: new Date(Date.now() + 60_000),
      });

      expect(await service.isRoomActive('room-1')).toBe(true);
    });

    it('self-heals and returns false when the room is active but past its expiresAt', async () => {
      chatRoomRepository.findById.mockResolvedValue({
        id: 'room-1',
        isActive: true,
        user1Id: 'user-1',
        user2Id: 'user-2',
        expiresAt: new Date(Date.now() - 60_000),
      });
      chatRoomRepository.expireRoom.mockResolvedValue(true);

      const result = await service.isRoomActive('room-1');

      expect(result).toBe(false);
      // isRoomActive proactively expires the stale room via expireChatRoom()
      expect(chatRoomRepository.expireRoom).toHaveBeenCalledWith('room-1');
    });
  });

  describe('getActiveRoom', () => {
    it('returns null when the user has no active room', async () => {
      chatRoomRepository.findActiveByUserId.mockResolvedValue(null);

      expect(await service.getActiveRoom('user-1')).toBeNull();
    });

    it('returns the room with the other participant derived when the caller is user1', async () => {
      chatRoomRepository.findActiveByUserId.mockResolvedValue({
        id: 'room-1',
        user1Id: 'user-1',
        user2Id: 'user-2',
        matchScore: 5,
        expiresAt: new Date('2026-07-26T18:40:00.000Z'),
      });

      const result = await service.getActiveRoom('user-1');

      expect(result).toEqual({
        roomId: 'room-1',
        matchScore: 5,
        expiresAt: new Date('2026-07-26T18:40:00.000Z'),
      });
    });

    it('derives the other participant correctly when the caller is user2', async () => {
      chatRoomRepository.findActiveByUserId.mockResolvedValue({
        id: 'room-1',
        user1Id: 'user-1',
        user2Id: 'user-2',
        matchScore: null,
        expiresAt: null,
      });

      const result = await service.getActiveRoom('user-2');

      expect(result).toEqual({
        roomId: 'room-1',
        matchScore: null,
        expiresAt: null,
      });
    });
  });
});
