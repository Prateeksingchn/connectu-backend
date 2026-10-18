import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FriendChatRoom } from '../entities/friend-chat-room.entity';

@Injectable()
export class FriendChatRoomRepository {
  constructor(
    @InjectRepository(FriendChatRoom)
    private readonly repo: Repository<FriendChatRoom>,
  ) {}

  async create(data: {
    friendshipId: string;
    user1Id: string;
    user2Id: string;
    isActive?: boolean;
  }): Promise<FriendChatRoom> {
    const room = this.repo.create({
      ...data,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });
    return this.repo.save(room);
  }

  async findById(id: string): Promise<FriendChatRoom | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['friendship', 'user1', 'user2'],
    });
  }

  async findActiveByFriendshipId(
    friendshipId: string,
  ): Promise<FriendChatRoom | null> {
    return this.repo.findOne({
      where: {
        friendshipId,
        isActive: true,
      },
      relations: ['friendship', 'user1', 'user2'],
    });
  }

  async findActiveByUserId(userId: string): Promise<FriendChatRoom[]> {
    return this.repo.find({
      where: [
        { user1Id: userId, isActive: true },
        { user2Id: userId, isActive: true },
      ],
      relations: ['friendship', 'user1', 'user2'],
      order: { lastMessageAt: 'DESC', updatedAt: 'DESC' },
    });
  }

  async findActiveByUserIdAndFriendId(
    userId: string,
    friendId: string,
  ): Promise<FriendChatRoom | null> {
    return this.repo.findOne({
      where: [
        { user1Id: userId, user2Id: friendId, isActive: true },
        { user1Id: friendId, user2Id: userId, isActive: true },
      ],
      relations: ['friendship', 'user1', 'user2'],
    });
  }

  async markInactive(id: string): Promise<void> {
    await this.repo.update(id, { isActive: false });
  }

  async updateLastMessage(
    id: string,
    lastMessageText: string,
    lastMessageAt: Date,
  ): Promise<void> {
    await this.repo.update(id, {
      lastMessageText,
      lastMessageAt,
      updatedAt: new Date(),
    });
  }

  async findValidActiveRoom(id: string): Promise<FriendChatRoom | null> {
    const room = await this.findById(id);

    if (!room) {
      return null;
    }

    if (!room.isActive) {
      return null;
    }

    return room;
  }
}
