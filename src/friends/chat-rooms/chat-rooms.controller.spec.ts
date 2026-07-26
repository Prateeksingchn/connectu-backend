import { Test, TestingModule } from '@nestjs/testing';
import { ChatRoomsController } from './chat-rooms.controller';
import { ChatRoomRequestService } from './chat-room-request.service';
import { FriendChatRoomService } from './friend-chat-room.service';
import { ChatMessageService } from './chat-message.service';

describe('ChatRoomsController', () => {
  let controller: ChatRoomsController;
  let chatMessageService: Record<string, jest.Mock>;

  const user = { id: 'user-a' };

  beforeEach(async () => {
    chatMessageService = { findByRoomId: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatRoomsController],
      providers: [
        { provide: ChatRoomRequestService, useValue: {} },
        { provide: FriendChatRoomService, useValue: {} },
        { provide: ChatMessageService, useValue: chatMessageService },
      ],
    }).compile();

    controller = module.get<ChatRoomsController>(ChatRoomsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getChatMessages', () => {
    it('delegates to ChatMessageService with the current user and default pagination', async () => {
      chatMessageService.findByRoomId.mockResolvedValue([
        { id: 'msg-1', content: 'hi' },
      ]);

      const result = await controller.getChatMessages(
        'room-1',
        {},
        user,
      );

      expect(chatMessageService.findByRoomId).toHaveBeenCalledWith(
        'room-1',
        'user-a',
        undefined,
        undefined,
      );
      expect(result).toEqual([{ id: 'msg-1', content: 'hi' }]);
    });

    it('converts the before query param to a Date and forwards limit', async () => {
      chatMessageService.findByRoomId.mockResolvedValue([]);

      await controller.getChatMessages(
        'room-1',
        { limit: 10, before: '2026-07-24T18:30:00.000Z' },
        user,
      );

      expect(chatMessageService.findByRoomId).toHaveBeenCalledWith(
        'room-1',
        'user-a',
        10,
        new Date('2026-07-24T18:30:00.000Z'),
      );
    });
  });
});
