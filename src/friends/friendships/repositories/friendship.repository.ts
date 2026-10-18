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

  /**
   * Atomically check-and-insert a PENDING friendship between two users.
   *
   * Guards against the race where near-simultaneous requesterId->addresseeId and
   * addresseeId->requesterId requests both pass a check-then-act read and each create
   * their own (mirrored) row. A Postgres advisory lock keyed on the sorted user pair
   * serializes concurrent callers for the same pair of users for the duration of the
   * transaction, so the second caller's existence check runs only after the first
   * caller's insert has committed (or rolled back).
   */
  async createIfAbsent(
    requesterId: string,
    addresseeId: string,
  ): Promise<{ friendship: Friendship; created: boolean }> {
    return this.repo.manager.transaction(async (manager) => {
      const [a, b] = [requesterId, addresseeId].sort();
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1)::bigint)',
        [`${a}:${b}`],
      );

      const existing = await manager.findOne(Friendship, {
        where: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
        relations: ['requester', 'addressee'],
      });

      if (existing) {
        return { friendship: existing, created: false };
      }

      const friendship = manager.create(Friendship, {
        requesterId,
        addresseeId,
        status: FriendshipStatus.PENDING,
      });
      const saved = await manager.save(Friendship, friendship);
      return { friendship: saved, created: true };
    });
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
      where: [{ requesterId: userId }, { addresseeId: userId }],
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
  async updateStatus(id: string, status: FriendshipStatus): Promise<boolean> {
    const result = await this.repo.update(id, { status });
    return result.affected !== undefined && result.affected > 0;
  }

  /**
   * Check if friendship exists between two users (any status)
   */
  async existsBetweenUsers(userId1: string, userId2: string): Promise<boolean> {
    const count = await this.repo.count({
      where: [
        { requesterId: userId1, addresseeId: userId2 },
        { requesterId: userId2, addresseeId: userId1 },
      ],
    });
    return count > 0;
  }
}
