import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { User } from './user.entity';
import { FriendshipRepository } from '../friends/friendships/repositories/friendship.repository';
import { FriendshipStatus } from '../friends/friendships/entities/friendship-status.enum';
import { RedisService } from '../redis/redis.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly friendshipRepository: FriendshipRepository,
    private readonly redisService: RedisService,
    private readonly wsGateway: WebSocketGateway,
  ) {}

  findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /**
   * Get user profile with strict access control
   * Rules:
   * - Users can ONLY view profiles if they are accepted friends
   * - No profile access during chat
   * - No profile access outside chat
   * - Full profile revealed ONLY after friend request is accepted
   */
  async findProfile(
    viewerId: string,
    targetUserId: string,
  ): Promise<User> {
    // Users can always view their own profile
    if (viewerId === targetUserId) {
      return this.findOne(targetUserId);
    }

    // Check if users are accepted friends
    const friendship = await this.friendshipRepository.findBetweenUsers(
      viewerId,
      targetUserId,
    );

    if (
      !friendship ||
      friendship.status !== FriendshipStatus.ACCEPTED
    ) {
      throw new ForbiddenException(
        'Profile access is only available to accepted friends',
      );
    }

    // Users are friends - allow profile access
    return this.findOne(targetUserId);
  }

  /**
   * Deletes a user. Friendship, ChatRoom, ChatRoomRequest, and FriendChatRoom rows
   * referencing this user are removed automatically via ON DELETE CASCADE. What the
   * DB cascade can't reach - the Redis matching-queue/active-room entries and the
   * gateway's in-memory connection state - is cleaned up explicitly here first.
   * Best-effort: a Redis/gateway failure is logged, not thrown, so the deletion
   * itself (the part that must succeed) doesn't depend on Redis being available.
   */
  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);

    try {
      await this.redisService.removeFromMatchingQueue([id]);
      await this.redisService.removeUserRoom(id);
      this.wsGateway.disconnectUser(id);
    } catch (error) {
      this.logger.error(
        `Failed to clean up Redis/gateway state for deleted user ${id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }

    await this.usersRepository.delete(id);
    return { message: 'User removed successfully' };
  }
}
