import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from '../entities/chat-room.entity';

@Injectable()
export class ChatRoomRepository {
  constructor(
    @InjectRepository(ChatRoom)
    private readonly repo: Repository<ChatRoom>,
  ) {}

  async create(data: {
    user1Id: string;
    user2Id: string;
    matchScore: number | null;
    expiresAt: Date;
    isActive?: boolean;
  }): Promise<ChatRoom> {
    const roomData: Partial<ChatRoom> = {
      user1Id: data.user1Id,
      user2Id: data.user2Id,
      expiresAt: data.expiresAt,
      isActive: data.isActive !== undefined ? data.isActive : true,
    };

    // Only include matchScore if it's not null
    if (data.matchScore !== null) {
      roomData.matchScore = data.matchScore;
    }

    const room = this.repo.create(roomData);
    return this.repo.save(room);
  }

  async findById(id: string): Promise<ChatRoom | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['user1', 'user2'],
    });
  }

  /**
   * Return a user's active chat room, self-healing a stale isActive flag the same
   * way findValidActiveRoom() does: the raw query only filters on isActive=true,
   * but MatchingScheduler only sweeps expired rooms once a minute, so a room that
   * already passed its expiresAt can still be flagged active for up to a minute.
   * Callers should be able to trust that a non-null result here is genuinely
   * still active, not just not-yet-swept.
   */
  async findActiveByUserId(userId: string): Promise<ChatRoom | null> {
    const room = await this.repo.findOne({
      where: [
        { user1Id: userId, isActive: true },
        { user2Id: userId, isActive: true },
      ],
    });

    if (!room) {
      return null;
    }

    const expiresAt = room.expiresAt
      ? new Date(room.expiresAt).getTime()
      : null;
    if (expiresAt && expiresAt <= Date.now()) {
      await this.expireRoom(room.id);
      return null;
    }

    return room;
  }

  async markInactive(id: string): Promise<void> {
    await this.repo.update(id, { isActive: false });
  }

  async endActiveChatRoom(
    id: string,
    user1Id: string,
    user2Id: string,
  ): Promise<void> {
    await this.repo.update(id, { isActive: false });
  }

  /**
   * Return a room only if it is active and not expired.
   * If the room is past expiresAt, it will be marked inactive and null returned.
   */
  async findValidActiveRoom(id: string): Promise<ChatRoom | null> {
    const room = await this.findById(id);

    if (!room) {
      return null;
    }

    if (!room.isActive) {
      return null;
    }

    const expiresAt = room.expiresAt
      ? new Date(room.expiresAt).getTime()
      : null;

    if (expiresAt && expiresAt <= Date.now()) {
      // Mark as expired; callers should treat as non-existent/expired
      await this.expireRoom(id);
      return null;
    }

    return room;
  }

  /**
   * Find all active chat rooms that have expired (expiresAt <= now)
   */
  async findExpiredActiveRooms(): Promise<ChatRoom[]> {
    const now = new Date();
    return this.repo
      .createQueryBuilder('room')
      .where('room.isActive = :isActive', { isActive: true })
      .andWhere('room.expiresAt <= :now', { now })
      .getMany();
  }

  /**
   * Idempotent method to mark room as inactive
   * Returns true if room was updated, false if already inactive
   */
  async expireRoom(id: string): Promise<boolean> {
    const result = await this.repo.update(
      { id, isActive: true },
      { isActive: false },
    );
    return result.affected !== undefined && result.affected > 0;
  }

  /**
   * Check if two users participated in the same chat room (any status)
   */
  async participatedInSameChatRoom(
    userId1: string,
    userId2: string,
  ): Promise<boolean> {
    const count = await this.repo.count({
      where: [
        { user1Id: userId1, user2Id: userId2 },
        { user1Id: userId2, user2Id: userId1 },
      ],
    });
    return count > 0;
  }
}
