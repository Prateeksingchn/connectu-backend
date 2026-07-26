import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ChatRoomRequestService } from './chat-room-request.service';
import { ChatRoomRequestRepository } from './repositories/chat-room-request.repository';
import { FriendshipRepository } from '../friendships/repositories/friendship.repository';
import { FriendshipStatus } from '../friendships/entities/friendship-status.enum';
import { FriendChatRoomRepository } from './repositories/friend-chat-room.repository';
import { WebSocketGateway } from '../../websocket/websocket.gateway';
import { WebSocketEvent } from '../../websocket/events/websocket.events';
import { ChatRoomRequestStatus } from './entities/chat-room-request-status.enum';

describe('ChatRoomRequestService', () => {
  let service: ChatRoomRequestService;
  let chatRoomRequestRepository: Record<string, jest.Mock>;
  let friendshipRepository: Record<string, jest.Mock>;
  let friendChatRoomRepository: Record<string, jest.Mock>;
  let wsGateway: Record<string, jest.Mock>;

  const requesterId = 'user-a';
  const friendId = 'user-b';

  beforeEach(async () => {
    chatRoomRequestRepository = {
      findBetweenUsers: jest.fn(),
      resetRequest: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      findPendingIncomingRequests: jest.fn(),
    };
    friendshipRepository = { findBetweenUsers: jest.fn() };
    friendChatRoomRepository = {
      findActiveByUserIdAndFriendId: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    };
    wsGateway = { emitToUser: jest.fn().mockReturnValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatRoomRequestService,
        { provide: ChatRoomRequestRepository, useValue: chatRoomRequestRepository },
        { provide: FriendshipRepository, useValue: friendshipRepository },
        { provide: FriendChatRoomRepository, useValue: friendChatRoomRepository },
        { provide: WebSocketGateway, useValue: wsGateway },
      ],
    }).compile();

    service = module.get<ChatRoomRequestService>(ChatRoomRequestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createChatRoomRequest', () => {
    it('rejects when there is no friendship between the users', async () => {
      friendshipRepository.findBetweenUsers.mockResolvedValue(null);

      await expect(
        service.createChatRoomRequest(requesterId, friendId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects when the friendship exists but is not ACCEPTED', async () => {
      friendshipRepository.findBetweenUsers.mockResolvedValue({
        status: FriendshipStatus.PENDING,
      });

      await expect(
        service.createChatRoomRequest(requesterId, friendId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects when a friend chat room between them is already active', async () => {
      friendshipRepository.findBetweenUsers.mockResolvedValue({
        status: FriendshipStatus.ACCEPTED,
      });
      friendChatRoomRepository.findActiveByUserIdAndFriendId.mockResolvedValue({
        id: 'room-1',
      });

      await expect(
        service.createChatRoomRequest(requesterId, friendId),
      ).rejects.toThrow(ConflictException);
      expect(chatRoomRequestRepository.create).not.toHaveBeenCalled();
    });

    it('reopens an existing request instead of creating a duplicate', async () => {
      friendshipRepository.findBetweenUsers.mockResolvedValue({
        status: FriendshipStatus.ACCEPTED,
      });
      chatRoomRequestRepository.findBetweenUsers.mockResolvedValue({ id: 'req-old' });
      chatRoomRequestRepository.resetRequest.mockResolvedValue({ id: 'req-old' });

      const result = await service.createChatRoomRequest(requesterId, friendId);

      expect(chatRoomRequestRepository.resetRequest).toHaveBeenCalledWith(
        'req-old',
        requesterId,
        friendId,
      );
      expect(chatRoomRequestRepository.create).not.toHaveBeenCalled();
      expect(wsGateway.emitToUser).toHaveBeenCalledWith(
        friendId,
        WebSocketEvent.CHAT_ROOM_REQUEST_RECEIVED,
        expect.objectContaining({ requestId: 'req-old', requesterId }),
      );
      expect(result).toEqual({
        message: 'Chat room request sent successfully',
        requestId: 'req-old',
      });
    });

    it('creates a brand-new PENDING request and notifies the friend', async () => {
      friendshipRepository.findBetweenUsers.mockResolvedValue({
        status: FriendshipStatus.ACCEPTED,
      });
      chatRoomRequestRepository.findBetweenUsers.mockResolvedValue(null);
      chatRoomRequestRepository.create.mockResolvedValue({ id: 'req-new' });

      const result = await service.createChatRoomRequest(requesterId, friendId);

      expect(chatRoomRequestRepository.create).toHaveBeenCalledWith({
        requesterId,
        addresseeId: friendId,
        status: ChatRoomRequestStatus.PENDING,
      });
      expect(wsGateway.emitToUser).toHaveBeenCalledWith(
        friendId,
        WebSocketEvent.CHAT_ROOM_REQUEST_RECEIVED,
        expect.objectContaining({ requestId: 'req-new' }),
      );
      expect(result).toEqual({
        message: 'Chat room request sent successfully',
        requestId: 'req-new',
      });
    });
  });

  describe('respondToChatRoomRequest', () => {
    it('throws NotFoundException when the request does not exist', async () => {
      chatRoomRequestRepository.findById.mockResolvedValue(null);

      await expect(
        service.respondToChatRoomRequest(friendId, {
          requestId: 'missing',
          status: ChatRoomRequestStatus.ACCEPTED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects when the responder is not the addressee', async () => {
      chatRoomRequestRepository.findById.mockResolvedValue({
        id: 'req-1',
        requesterId,
        addresseeId: 'someone-else',
      });

      await expect(
        service.respondToChatRoomRequest(friendId, {
          requestId: 'req-1',
          status: ChatRoomRequestStatus.ACCEPTED,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(chatRoomRequestRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('throws when the status update fails to affect any row', async () => {
      chatRoomRequestRepository.findById.mockResolvedValue({
        id: 'req-1',
        requesterId,
        addresseeId: friendId,
      });
      chatRoomRequestRepository.updateStatus.mockResolvedValue(false);

      await expect(
        service.respondToChatRoomRequest(friendId, {
          requestId: 'req-1',
          status: ChatRoomRequestStatus.ACCEPTED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when accepting but the underlying friendship no longer exists', async () => {
      chatRoomRequestRepository.findById.mockResolvedValue({
        id: 'req-1',
        requesterId,
        addresseeId: friendId,
      });
      chatRoomRequestRepository.updateStatus.mockResolvedValue(true);
      friendshipRepository.findBetweenUsers.mockResolvedValue(null);

      await expect(
        service.respondToChatRoomRequest(friendId, {
          requestId: 'req-1',
          status: ChatRoomRequestStatus.ACCEPTED,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(friendChatRoomRepository.create).not.toHaveBeenCalled();
    });

    it('creates the friend chat room and notifies both users when accepted', async () => {
      chatRoomRequestRepository.findById.mockResolvedValue({
        id: 'req-1',
        requesterId,
        addresseeId: friendId,
      });
      chatRoomRequestRepository.updateStatus.mockResolvedValue(true);
      friendshipRepository.findBetweenUsers.mockResolvedValue({ id: 'friendship-1' });
      friendChatRoomRepository.create.mockResolvedValue({ id: 'room-new' });

      const result = await service.respondToChatRoomRequest(friendId, {
        requestId: 'req-1',
        status: ChatRoomRequestStatus.ACCEPTED,
      });

      expect(friendChatRoomRepository.create).toHaveBeenCalledWith({
        friendshipId: 'friendship-1',
        user1Id: requesterId,
        user2Id: friendId,
        isActive: true,
      });
      expect(wsGateway.emitToUser).toHaveBeenCalledWith(
        requesterId,
        WebSocketEvent.CHAT_ROOM_CREATED,
        expect.objectContaining({ roomId: 'room-new', friendId }),
      );
      expect(wsGateway.emitToUser).toHaveBeenCalledWith(
        friendId,
        WebSocketEvent.CHAT_ROOM_CREATED,
        expect.objectContaining({ roomId: 'room-new', friendId: requesterId }),
      );
      expect(result).toEqual({
        message: 'Chat room request accepted and room created successfully',
        roomId: 'room-new',
      });
    });

    it('notifies only the requester and creates no room when rejected', async () => {
      chatRoomRequestRepository.findById.mockResolvedValue({
        id: 'req-1',
        requesterId,
        addresseeId: friendId,
      });
      chatRoomRequestRepository.updateStatus.mockResolvedValue(true);

      const result = await service.respondToChatRoomRequest(friendId, {
        requestId: 'req-1',
        status: ChatRoomRequestStatus.REJECTED,
      });

      expect(friendChatRoomRepository.create).not.toHaveBeenCalled();
      expect(wsGateway.emitToUser).toHaveBeenCalledWith(
        requesterId,
        WebSocketEvent.CHAT_ROOM_REQUEST_REJECTED,
        expect.objectContaining({ requestId: 'req-1' }),
      );
      expect(result).toEqual({ message: 'Chat room request rejected successfully' });
    });
  });

  describe('getPendingChatRoomRequests', () => {
    it('maps pending incoming requests with requester details', async () => {
      chatRoomRequestRepository.findPendingIncomingRequests.mockResolvedValue([
        {
          id: 'req-1',
          requester: { id: requesterId, name: 'Alice', email: 'alice@example.com' },
          createdAt: 'today',
        },
      ]);

      const result = await service.getPendingChatRoomRequests(friendId);

      expect(result).toEqual([
        {
          requestId: 'req-1',
          requester: { id: requesterId, name: 'Alice', email: 'alice@example.com' },
          createdAt: 'today',
        },
      ]);
    });
  });
});
