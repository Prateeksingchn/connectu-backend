import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { ChatMessage } from '../entities/chat-message.entity';

@Injectable()
export class ChatMessageRepository {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly repo: Repository<ChatMessage>,
  ) {}

  async create(data: {
    roomId: string;
    senderId: string;
    content: string;
  }): Promise<ChatMessage> {
    const message = this.repo.create(data);
    return this.repo.save(message);
  }

  /**
   * Cursor-paginated history for a room, newest first. `before` (a message's
   * createdAt) fetches the page strictly older than that cursor, so callers
   * page backward through history using the last item's createdAt from the
   * previous page. Matches the (roomId, createdAt DESC) index - no offset scan.
   */
  async findByRoomId(
    roomId: string,
    limit: number,
    before?: Date,
  ): Promise<ChatMessage[]> {
    return this.repo.find({
      where: before ? { roomId, createdAt: LessThan(before) } : { roomId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
