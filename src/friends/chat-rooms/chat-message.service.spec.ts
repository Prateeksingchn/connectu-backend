import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ChatMessageService } from './chat-message.service';
import { ChatMessageRepository } from './repositories/chat-message.repository';
import { FriendChatRoomRepository } from './repositories/friend-chat-room.repository';

describe('ChatMessageService', () => {
  let service: ChatMessageService;
  let chatMessageRepository: Record<string, jest.Mock>;
  let friendChatRoomRepository: Record<string, jest.Mock>;

  beforeEach(async () => {
    chatMessageRepository = {
      create: jest.fn(),
      findByRoomId: jest.fn(),
    };
    friendChatRoomRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatMessageService,
        { provide: ChatMessageRepository, useValue: chatMessageRepository },
        { provide: FriendChatRoomRepository, useValue: friendChatRoomRepository },
      ],
    }).compile();

    service = module.get<ChatMessageService>(ChatMessageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveMessage', () => {
    it('persists the message via the repository', async () => {
      chatMessageRepository.create.mockResolvedValue({
        id: 'msg-1',
        roomId: 'room-1',
        senderId: 'user-1',
        content: 'hi',
      });

      const result = await service.saveMessage('room-1', 'user-1', 'hi');

      expect(chatMessageRepository.create).toHaveBeenCalledWith({
        roomId: 'room-1',
        senderId: 'user-1',
        content: 'hi',
      });
      expect(result).toEqual(
        expect.objectContaining({ id: 'msg-1', content: 'hi' }),
      );
    });
  });

  describe('findByRoomId', () => {
    it('throws when the friend chat room does not exist', async () => {
      friendChatRoomRepository.findById.mockResolvedValue(null);

      await expect(
        service.findByRoomId('room-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(chatMessageRepository.findByRoomId).not.toHaveBeenCalled();
    });

    it('rejects a caller who is not a participant in the room', async () => {
      friendChatRoomRepository.findById.mockResolvedValue({
        id: 'room-1',
        user1Id: 'user-a',
        user2Id: 'user-b',
      });

      await expect(
        service.findByRoomId('room-1', 'someone-else'),
      ).rejects.toThrow(ForbiddenException);
      expect(chatMessageRepository.findByRoomId).not.toHaveBeenCalled();
    });

    it('returns the page of messages for a participant, defaulting the limit', async () => {
      friendChatRoomRepository.findById.mockResolvedValue({
        id: 'room-1',
        user1Id: 'user-a',
        user2Id: 'user-b',
      });
      chatMessageRepository.findByRoomId.mockResolvedValue([
        { id: 'msg-1', content: 'hi' },
      ]);

      const result = await service.findByRoomId('room-1', 'user-b');

      expect(chatMessageRepository.findByRoomId).toHaveBeenCalledWith(
        'room-1',
        50,
        undefined,
      );
      expect(result).toEqual([{ id: 'msg-1', content: 'hi' }]);
    });

    it('passes the before cursor through and caps the limit at 100', async () => {
      friendChatRoomRepository.findById.mockResolvedValue({
        id: 'room-1',
        user1Id: 'user-a',
        user2Id: 'user-b',
      });
      chatMessageRepository.findByRoomId.mockResolvedValue([]);
      const before = new Date('2026-07-24T18:30:00.000Z');

      await service.findByRoomId('room-1', 'user-a', 500, before);

      expect(chatMessageRepository.findByRoomId).toHaveBeenCalledWith(
        'room-1',
        100,
        before,
      );
    });
  });
});
