import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ChatMessageRepository } from './repositories/chat-message.repository';
import { FriendChatRoomRepository } from './repositories/friend-chat-room.repository';
import { ChatMessage } from './entities/chat-message.entity';

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 100;

@Injectable()
export class ChatMessageService {
  private readonly logger = new Logger(ChatMessageService.name);

  constructor(
    private readonly chatMessageRepository: ChatMessageRepository,
    private readonly friendChatRoomRepository: FriendChatRoomRepository,
  ) {}

  /**
   * Persist a message sent in a friend chat room. Callers (the websocket
   * gateway) are responsible for confirming the room is a friend chat room
   * before calling this - this service does not persist anything for
   * anonymous matching chat rooms.
   */
  async saveMessage(
    roomId: string,
    senderId: string,
    content: string,
  ): Promise<ChatMessage> {
    const message = await this.chatMessageRepository.create({
      roomId,
      senderId,
      content,
    });

    this.logger.log(
      `Message persisted in friend chat room ${roomId.substring(0, 8)} from ${senderId.substring(0, 8)}`,
    );

    return message;
  }

  /**
   * Cursor-paginated message history for a friend chat room. Only a
   * participant (user1 or user2) of the room may read its messages.
   */
  async findByRoomId(
    roomId: string,
    userId: string,
    limit: number = DEFAULT_PAGE_LIMIT,
    before?: Date,
  ): Promise<ChatMessage[]> {
    const friendChatRoom = await this.friendChatRoomRepository.findById(roomId);

    if (!friendChatRoom) {
      throw new BadRequestException('Friend chat room not found');
    }

    if (
      friendChatRoom.user1Id !== userId &&
      friendChatRoom.user2Id !== userId
    ) {
      throw new ForbiddenException(
        'You are not authorized to view this chat room',
      );
    }

    const boundedLimit = Math.min(Math.max(limit, 1), MAX_PAGE_LIMIT);

    return this.chatMessageRepository.findByRoomId(
      roomId,
      boundedLimit,
      before,
    );
  }
}
