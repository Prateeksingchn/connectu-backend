import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { FriendChatRoomRepository } from './repositories/friend-chat-room.repository';
import { MatchingService } from '../../matching/matching.service';

@Injectable()
export class FriendChatRoomService {
  private readonly logger = new Logger(FriendChatRoomService.name);

  constructor(
    private readonly friendChatRoomRepository: FriendChatRoomRepository,
    private readonly matchingService: MatchingService,
  ) {}

  /**
   * End a friend chat room
   * Verifies the user is a participant and ends the chat room
   */
  async endFriendChatRoom(
    roomId: string,
    userId: string,
  ): Promise<{ message: string }> {
    // Verify the friend chat room exists and user is a participant
    const friendChatRoom =
      await this.friendChatRoomRepository.findById(roomId);

    if (!friendChatRoom) {
      throw new BadRequestException('Friend chat room not found');
    }

    // Verify user is part of this chat room
    if (
      friendChatRoom.user1Id !== userId &&
      friendChatRoom.user2Id !== userId
    ) {
      throw new ForbiddenException(
        'You are not authorized to end this chat room',
      );
    }

    // Mark as inactive
    await this.friendChatRoomRepository.markInactive(roomId);

    this.logger.log(
      `Friend chat room ${roomId.substring(0, 8)} ended by user ${userId.substring(0, 8)}`,
    );

    return { message: 'Friend chat room ended successfully' };
  }

  /**
   * Get all active friend chat rooms for a user
   */
  async getActiveFriendChatRooms(userId: string): Promise<any[]> {
    const rooms =
      await this.friendChatRoomRepository.findActiveByUserId(userId);

    return rooms.map((room) => {
      const friend =
        room.user1Id === userId ? room.user2 : room.user1;

      return {
        roomId: room.id,
        friend: {
          id: friend.id,
          name: friend.name,
          email: friend.email,
        },
        lastMessageAt: room.lastMessageAt,
        lastMessageText: room.lastMessageText,
        createdAt: room.createdAt,
      };
    });
  }

  /**
   * Update last message in friend chat room
   */
  async updateLastMessage(
    roomId: string,
    messageText: string,
  ): Promise<void> {
    await this.friendChatRoomRepository.updateLastMessage(
      roomId,
      messageText,
      new Date(),
    );
  }
}

