import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friendship } from '../entities/friendship.entity';
import { FriendshipStatus } from '../entities/friendship-status.enum';

@Injectable()
export class FriendshipRepository {
  constructor(
    @InjectRepository(Friendship)
    private readonly repo: Repository<Friendship>,
  ) {}

  async create(data: {
    requesterId: string;
    addresseeId: string;
    status?: FriendshipStatus;
  }): Promise<Friendship> {
    const friendship = this.repo.create({
      ...data,
      status: data.status || FriendshipStatus.PENDING,
    });
    return this.repo.save(friendship);
  }

  async findById(id: string): Promise<Friendship | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['requester', 'addressee'],
    });
  }

  /**
   * Find friendship between two users (checks both directions)
   */
  async findBetweenUsers(
    userId1: string,
    userId2: string,
  ): Promise<Friendship | null> {
    return this.repo.findOne({
      where: [
        { requesterId: userId1, addresseeId: userId2 },
        { requesterId: userId2, addresseeId: userId1 },
      ],
      relations: ['requester', 'addressee'],
    });
  }

  /**
   * Find friendship where user is requester or addressee
   */
  async findByUser(userId: string): Promise<Friendship[]> {
    return this.repo.find({
      where: [
        { requesterId: userId },
        { addresseeId: userId },
      ],
      relations: ['requester', 'addressee'],
    });
  }

  /**
   * Find accepted friendships for a user
   */
  async findAcceptedFriendships(userId: string): Promise<Friendship[]> {
    return this.repo.find({
      where: [
        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
        { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
      ],
      relations: ['requester', 'addressee'],
    });
  }

  /**
   * Find pending incoming requests (where user is addressee)
   */
  async findPendingIncomingRequests(userId: string): Promise<Friendship[]> {
    return this.repo.find({
      where: {
        addresseeId: userId,
        status: FriendshipStatus.PENDING,
      },
      relations: ['requester', 'addressee'],
    });
  }

  /**
   * Update friendship status
   */
  async updateStatus(
    id: string,
    status: FriendshipStatus,
  ): Promise<boolean> {
    const result = await this.repo.update(id, { status });
    return result.affected !== undefined && result.affected > 0;
  }

  /**
   * Check if friendship exists between two users (any status)
   */
  async existsBetweenUsers(
    userId1: string,
    userId2: string,
  ): Promise<boolean> {
    const count = await this.repo.count({
      where: [
        { requesterId: userId1, addresseeId: userId2 },
        { requesterId: userId2, addresseeId: userId1 },
      ],
    });
    return count > 0;
  }
}

