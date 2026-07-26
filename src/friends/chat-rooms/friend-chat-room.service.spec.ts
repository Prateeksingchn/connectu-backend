import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { FriendChatRoomService } from './friend-chat-room.service';
import { FriendChatRoomRepository } from './repositories/friend-chat-room.repository';
import { MatchingService } from '../../matching/matching.service';

describe('FriendChatRoomService', () => {
  let service: FriendChatRoomService;
  let friendChatRoomRepository: Record<string, jest.Mock>;

  beforeEach(async () => {
    friendChatRoomRepository = {
      findById: jest.fn(),
      markInactive: jest.fn(),
      findActiveByUserId: jest.fn(),
      updateLastMessage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendChatRoomService,
        { provide: FriendChatRoomRepository, useValue: friendChatRoomRepository },
        { provide: MatchingService, useValue: {} },
      ],
    }).compile();

    service = module.get<FriendChatRoomService>(FriendChatRoomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('endFriendChatRoom', () => {
    it('throws when the friend chat room does not exist', async () => {
      friendChatRoomRepository.findById.mockResolvedValue(null);

      await expect(
        service.endFriendChatRoom('room-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(friendChatRoomRepository.markInactive).not.toHaveBeenCalled();
    });

    it('rejects a caller who is not a participant in the room', async () => {
      friendChatRoomRepository.findById.mockResolvedValue({
        id: 'room-1',
        user1Id: 'user-a',
        user2Id: 'user-b',
      });

      await expect(
        service.endFriendChatRoom('room-1', 'someone-else'),
      ).rejects.toThrow(ForbiddenException);
      expect(friendChatRoomRepository.markInactive).not.toHaveBeenCalled();
    });

    it('allows the room to be ended by user1', async () => {
      friendChatRoomRepository.findById.mockResolvedValue({
        id: 'room-1',
        user1Id: 'user-a',
        user2Id: 'user-b',
      });

      const result = await service.endFriendChatRoom('room-1', 'user-a');

      expect(friendChatRoomRepository.markInactive).toHaveBeenCalledWith('room-1');
      expect(result).toEqual({ message: 'Friend chat room ended successfully' });
    });

    it('allows the room to be ended by user2 as well', async () => {
      friendChatRoomRepository.findById.mockResolvedValue({
        id: 'room-1',
        user1Id: 'user-a',
        user2Id: 'user-b',
      });

      const result = await service.endFriendChatRoom('room-1', 'user-b');

      expect(friendChatRoomRepository.markInactive).toHaveBeenCalledWith('room-1');
      expect(result).toEqual({ message: 'Friend chat room ended successfully' });
    });
  });

  describe('getActiveFriendChatRooms', () => {
    it('returns the other participant regardless of which side the current user is on', async () => {
      friendChatRoomRepository.findActiveByUserId.mockResolvedValue([
        {
          id: 'room-1',
          user1Id: 'user-1',
          user1: { id: 'user-1', name: 'Me', email: 'me@example.com' },
          user2Id: 'user-2',
          user2: { id: 'user-2', name: 'Friend', email: 'friend@example.com' },
          lastMessageAt: 't1',
          lastMessageText: 'hi',
          createdAt: 'c1',
        },
      ]);

      const result = await service.getActiveFriendChatRooms('user-1');

      expect(result).toEqual([
        {
          roomId: 'room-1',
          friend: { id: 'user-2', name: 'Friend', email: 'friend@example.com' },
          lastMessageAt: 't1',
          lastMessageText: 'hi',
          createdAt: 'c1',
        },
      ]);
    });
  });

  describe('updateLastMessage', () => {
    it('forwards the room id, message text, and a timestamp to the repository', async () => {
      await service.updateLastMessage('room-1', 'hello there');

      expect(friendChatRoomRepository.updateLastMessage).toHaveBeenCalledWith(
        'room-1',
        'hello there',
        expect.any(Date),
      );
    });
  });
});
