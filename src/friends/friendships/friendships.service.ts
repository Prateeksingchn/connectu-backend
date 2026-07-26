import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { FriendshipRepository } from './repositories/friendship.repository';
import { ChatRoomRepository } from '../../matching/repositories/chat-room.repository';
import { FriendshipStatus } from './entities/friendship-status.enum';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { RespondFriendRequestDto } from './dto/respond-friend-request.dto';

@Injectable()
export class FriendshipsService {
  private readonly logger = new Logger(FriendshipsService.name);

  constructor(
    private readonly friendshipRepository: FriendshipRepository,
    private readonly chatRoomRepository: ChatRoomRepository,
  ) {}

  /**
   * Check if two users have an active chat room
   */
  private async hasActiveChatRoom(
    userId1: string,
    userId2: string,
  ): Promise<boolean> {
    // findActiveByUserId() is expiry-aware (self-heals a stale isActive flag), so a
    // non-null result here is genuinely still active, not just not-yet-swept.
    // Check if either user has an active chat room with the other
    const room1 = await this.chatRoomRepository.findActiveByUserId(userId1);
    if (room1) {
      if (
        (room1.user1Id === userId1 && room1.user2Id === userId2) ||
        (room1.user1Id === userId2 && room1.user2Id === userId1)
      ) {
        return true;
      }
    }

    const room2 = await this.chatRoomRepository.findActiveByUserId(userId2);
    if (room2) {
      if (
        (room2.user1Id === userId1 && room2.user2Id === userId2) ||
        (room2.user1Id === userId2 && room2.user2Id === userId1)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if two users participated in the same chat room (any status)
   */
  private async participatedInSameChatRoom(
    userId1: string,
    userId2: string,
  ): Promise<boolean> {
    return this.chatRoomRepository.participatedInSameChatRoom(
      userId1,
      userId2,
    );
  }

  /**
   * Send a friend request
   * Rules:
   * - Cannot send to self
   * - Both users must have participated in the same chat room
   * - Chat room must not be active
   * - No existing friendship record
   */
  async sendFriendRequest(
    requesterId: string,
    dto: SendFriendRequestDto,
  ): Promise<{ message: string; friendshipId: string }> {
    const { addresseeId } = dto;

    // Rule 1: Cannot send to self
    if (requesterId === addresseeId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Rule 2: Check if there's an active chat room
    const hasActiveChat = await this.hasActiveChatRoom(requesterId, addresseeId);
    if (hasActiveChat) {
      throw new ForbiddenException(
        'Cannot send friend request while chat room is active',
      );
    }

    // Rule 3: Check if users participated in the same chat room
    const participatedTogether = await this.participatedInSameChatRoom(
      requesterId,
      addresseeId,
    );
    if (!participatedTogether) {
      throw new ForbiddenException(
        'Can only send friend requests to users you have chatted with',
      );
    }

    // Rule 4: Atomically check-and-insert so concurrent A->B / B->A requests
    // can't both pass the existence check and create mirrored PENDING rows.
    const { friendship, created } = await this.friendshipRepository.createIfAbsent(
      requesterId,
      addresseeId,
    );

    if (!created) {
      if (friendship.status === FriendshipStatus.ACCEPTED) {
        throw new ConflictException('Users are already friends');
      }
      if (friendship.status === FriendshipStatus.PENDING) {
        throw new ConflictException('Friend request already pending');
      }
      if (friendship.status === FriendshipStatus.REJECTED) {
        throw new ConflictException(
          'Friend request was rejected and cannot be recreated',
        );
      }
    }

    this.logger.log(
      `Friend request sent: ${requesterId.substring(0, 8)} -> ${addresseeId.substring(0, 8)}`,
    );

    return {
      message: 'Friend request sent successfully',
      friendshipId: friendship.id,
    };
  }

  /**
   * Respond to a friend request (accept or reject)
   * Rules:
   * - Only addressee can respond
   * - Request must be PENDING
   * - Cannot modify ACCEPTED or REJECTED requests
   */
  async respondToFriendRequest(
    addresseeId: string,
    dto: RespondFriendRequestDto,
  ): Promise<{ message: string }> {
    const { friendshipId, status } = dto;

    // Find friendship
    const friendship = await this.friendshipRepository.findById(friendshipId);
    if (!friendship) {
      throw new BadRequestException('Friend request not found');
    }

    // Rule: Only addressee can respond
    if (friendship.addresseeId !== addresseeId) {
      throw new ForbiddenException(
        'Only the recipient can respond to friend requests',
      );
    }

    // Rule: Request must be PENDING
    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException(
        `Cannot modify friend request with status: ${friendship.status}`,
      );
    }

    // Update status
    const updated = await this.friendshipRepository.updateStatus(
      friendshipId,
      status,
    );

    if (!updated) {
      throw new BadRequestException('Failed to update friend request');
    }

    this.logger.log(
      `Friend request ${status.toLowerCase()}: ${friendship.requesterId.substring(0, 8)} <-> ${addresseeId.substring(0, 8)}`,
    );

    return {
      message: `Friend request ${status.toLowerCase()} successfully`,
    };
  }

  /**
   * Get list of accepted friends for a user
   */
  async getFriends(userId: string): Promise<any[]> {
    const friendships =
      await this.friendshipRepository.findAcceptedFriendships(userId);

    return friendships.map((friendship) => {
      // Return the other user (not the current user)
      const friend =
        friendship.requesterId === userId
          ? friendship.addressee
          : friendship.requester;

      return {
        friendshipId: friendship.id,
        friend: {
          id: friend.id,
          name: friend.name,
          email: friend.email,
          // Include other profile fields as needed
        },
        createdAt: friendship.createdAt,
      };
    });
  }

  /**
   * Get list of pending incoming friend requests
   */
  async getPendingRequests(userId: string): Promise<any[]> {
    const friendships =
      await this.friendshipRepository.findPendingIncomingRequests(userId);

    return friendships.map((friendship) => ({
      friendshipId: friendship.id,
      requester: {
        id: friendship.requester.id,
        name: friendship.requester.name,
        email: friendship.requester.email,
      },
      createdAt: friendship.createdAt,
    }));
  }
}

