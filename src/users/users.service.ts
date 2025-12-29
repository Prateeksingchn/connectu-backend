import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { User } from './user.entity';
import { FriendshipRepository } from '../friends/friendships/repositories/friendship.repository';
import { FriendshipStatus } from '../friends/friendships/entities/friendship-status.enum';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly friendshipRepository: FriendshipRepository,
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

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);
    await this.usersRepository.delete(id);
    return { message: 'User removed successfully' };
  }
}
