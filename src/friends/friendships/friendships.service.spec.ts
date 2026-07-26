import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { FriendshipsService } from './friendships.service';
import { FriendshipRepository } from './repositories/friendship.repository';
import { ChatRoomRepository } from '../../matching/repositories/chat-room.repository';
import { FriendshipStatus } from './entities/friendship-status.enum';

describe('FriendshipsService', () => {
  let service: FriendshipsService;
  let friendshipRepository: Record<string, jest.Mock>;
  let chatRoomRepository: Record<string, jest.Mock>;

  const requesterId = 'user-a';
  const addresseeId = 'user-b';

  beforeEach(async () => {
    friendshipRepository = {
      createIfAbsent: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      findAcceptedFriendships: jest.fn(),
      findPendingIncomingRequests: jest.fn(),
    };
    chatRoomRepository = {
      findActiveByUserId: jest.fn().mockResolvedValue(null),
      participatedInSameChatRoom: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendshipsService,
        { provide: FriendshipRepository, useValue: friendshipRepository },
        { provide: ChatRoomRepository, useValue: chatRoomRepository },
      ],
    }).compile();

    service = module.get<FriendshipsService>(FriendshipsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendFriendRequest', () => {
    it('rejects a request to yourself before checking anything else', async () => {
      await expect(
        service.sendFriendRequest(requesterId, { addresseeId: requesterId }),
      ).rejects.toThrow(BadRequestException);
      expect(chatRoomRepository.findActiveByUserId).not.toHaveBeenCalled();
    });

    it('rejects while the two users still share an active chat room', async () => {
      chatRoomRepository.findActiveByUserId.mockImplementation(async (userId: string) =>
        userId === requesterId
          ? { id: 'room-1', user1Id: requesterId, user2Id: addresseeId, isActive: true }
          : null,
      );

      await expect(
        service.sendFriendRequest(requesterId, { addresseeId }),
      ).rejects.toThrow(ForbiddenException);
      expect(friendshipRepository.createIfAbsent).not.toHaveBeenCalled();
    });

    // Expiry-awareness for "is this an active room" now lives entirely in
    // ChatRoomRepository.findActiveByUserId() itself (see
    // matching/repositories/chat-room.repository.spec.ts) - it self-heals a stale
    // isActive flag before ever returning a room, so hasActiveChatRoom() can just
    // trust a non-null result unconditionally. No expiry-boundary test needed here
    // anymore.

    it('rejects when the two users have never chatted together', async () => {
      chatRoomRepository.participatedInSameChatRoom.mockResolvedValue(false);

      await expect(
        service.sendFriendRequest(requesterId, { addresseeId }),
      ).rejects.toThrow(ForbiddenException);
      expect(friendshipRepository.createIfAbsent).not.toHaveBeenCalled();
    });

    it('rejects with a conflict when the users are already accepted friends', async () => {
      friendshipRepository.createIfAbsent.mockResolvedValue({
        created: false,
        friendship: { id: 'f-1', status: FriendshipStatus.ACCEPTED },
      });

      await expect(
        service.sendFriendRequest(requesterId, { addresseeId }),
      ).rejects.toThrow(new ConflictException('Users are already friends'));
    });

    it('rejects with a conflict when a request is already pending', async () => {
      friendshipRepository.createIfAbsent.mockResolvedValue({
        created: false,
        friendship: { id: 'f-1', status: FriendshipStatus.PENDING },
      });

      await expect(
        service.sendFriendRequest(requesterId, { addresseeId }),
      ).rejects.toThrow(new ConflictException('Friend request already pending'));
    });

    it('rejects with a conflict and refuses to recreate a previously rejected request', async () => {
      friendshipRepository.createIfAbsent.mockResolvedValue({
        created: false,
        friendship: { id: 'f-1', status: FriendshipStatus.REJECTED },
      });

      await expect(
        service.sendFriendRequest(requesterId, { addresseeId }),
      ).rejects.toThrow(
        new ConflictException('Friend request was rejected and cannot be recreated'),
      );
    });

    it('creates a new PENDING friendship on the happy path', async () => {
      friendshipRepository.createIfAbsent.mockResolvedValue({
        created: true,
        friendship: { id: 'f-new', status: FriendshipStatus.PENDING },
      });

      const result = await service.sendFriendRequest(requesterId, { addresseeId });

      expect(friendshipRepository.createIfAbsent).toHaveBeenCalledWith(
        requesterId,
        addresseeId,
      );
      expect(result).toEqual({
        message: 'Friend request sent successfully',
        friendshipId: 'f-new',
      });
    });
  });

  describe('respondToFriendRequest', () => {
    it('rejects when the friendship record does not exist', async () => {
      friendshipRepository.findById.mockResolvedValue(null);

      await expect(
        service.respondToFriendRequest(addresseeId, {
          friendshipId: 'missing',
          status: FriendshipStatus.ACCEPTED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when the responder is not the addressee', async () => {
      friendshipRepository.findById.mockResolvedValue({
        id: 'f-1',
        addresseeId: 'someone-else',
        status: FriendshipStatus.PENDING,
      });

      await expect(
        service.respondToFriendRequest(addresseeId, {
          friendshipId: 'f-1',
          status: FriendshipStatus.ACCEPTED,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(friendshipRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('rejects when the request is not currently PENDING', async () => {
      friendshipRepository.findById.mockResolvedValue({
        id: 'f-1',
        addresseeId,
        status: FriendshipStatus.ACCEPTED,
      });

      await expect(
        service.respondToFriendRequest(addresseeId, {
          friendshipId: 'f-1',
          status: FriendshipStatus.REJECTED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when the status update fails to affect any row', async () => {
      friendshipRepository.findById.mockResolvedValue({
        id: 'f-1',
        addresseeId,
        requesterId,
        status: FriendshipStatus.PENDING,
      });
      friendshipRepository.updateStatus.mockResolvedValue(false);

      await expect(
        service.respondToFriendRequest(addresseeId, {
          friendshipId: 'f-1',
          status: FriendshipStatus.ACCEPTED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts a pending request on the happy path', async () => {
      friendshipRepository.findById.mockResolvedValue({
        id: 'f-1',
        addresseeId,
        requesterId,
        status: FriendshipStatus.PENDING,
      });
      friendshipRepository.updateStatus.mockResolvedValue(true);

      const result = await service.respondToFriendRequest(addresseeId, {
        friendshipId: 'f-1',
        status: FriendshipStatus.ACCEPTED,
      });

      expect(friendshipRepository.updateStatus).toHaveBeenCalledWith(
        'f-1',
        FriendshipStatus.ACCEPTED,
      );
      expect(result).toEqual({ message: 'Friend request accepted successfully' });
    });

    it('rejects a pending request on the happy path', async () => {
      friendshipRepository.findById.mockResolvedValue({
        id: 'f-1',
        addresseeId,
        requesterId,
        status: FriendshipStatus.PENDING,
      });
      friendshipRepository.updateStatus.mockResolvedValue(true);

      const result = await service.respondToFriendRequest(addresseeId, {
        friendshipId: 'f-1',
        status: FriendshipStatus.REJECTED,
      });

      expect(result).toEqual({ message: 'Friend request rejected successfully' });
    });
  });

  describe('getFriends', () => {
    it('returns the other participant, whichever side the current user was on', async () => {
      friendshipRepository.findAcceptedFriendships.mockResolvedValue([
        {
          id: 'f-1',
          requesterId,
          addresseeId,
          addressee: { id: addresseeId, name: 'Bob', email: 'bob@example.com' },
          requester: { id: requesterId, name: 'Alice', email: 'alice@example.com' },
          createdAt: 'yesterday',
        },
        {
          id: 'f-2',
          requesterId: 'user-c',
          addresseeId: requesterId,
          addressee: { id: requesterId, name: 'Alice', email: 'alice@example.com' },
          requester: { id: 'user-c', name: 'Carol', email: 'carol@example.com' },
          createdAt: 'today',
        },
      ]);

      const result = await service.getFriends(requesterId);

      expect(result).toEqual([
        {
          friendshipId: 'f-1',
          friend: { id: addresseeId, name: 'Bob', email: 'bob@example.com' },
          createdAt: 'yesterday',
        },
        {
          friendshipId: 'f-2',
          friend: { id: 'user-c', name: 'Carol', email: 'carol@example.com' },
          createdAt: 'today',
        },
      ]);
    });
  });

  describe('getPendingRequests', () => {
    it('returns pending incoming requests with requester details', async () => {
      friendshipRepository.findPendingIncomingRequests.mockResolvedValue([
        {
          id: 'f-1',
          requester: { id: requesterId, name: 'Alice', email: 'alice@example.com' },
          createdAt: 'today',
        },
      ]);

      const result = await service.getPendingRequests(addresseeId);

      expect(friendshipRepository.findPendingIncomingRequests).toHaveBeenCalledWith(
        addresseeId,
      );
      expect(result).toEqual([
        {
          friendshipId: 'f-1',
          requester: { id: requesterId, name: 'Alice', email: 'alice@example.com' },
          createdAt: 'today',
        },
      ]);
    });
  });
});
