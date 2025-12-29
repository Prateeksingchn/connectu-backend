import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoomRequest } from '../entities/chat-room-request.entity';
import { ChatRoomRequestStatus } from '../entities/chat-room-request-status.enum';

@Injectable()
export class ChatRoomRequestRepository {
  constructor(
    @InjectRepository(ChatRoomRequest)
    private readonly repo: Repository<ChatRoomRequest>,
  ) {}

  async create(data: {
    requesterId: string;
    addresseeId: string;
    status?: ChatRoomRequestStatus;
  }): Promise<ChatRoomRequest> {
    const request = this.repo.create({
      ...data,
      status: data.status || ChatRoomRequestStatus.PENDING,
    });
    return this.repo.save(request);
  }

  async findById(id: string): Promise<ChatRoomRequest | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['requester', 'addressee'],
    });
  }

  /**
   * Find chat room request between two users (checks both directions)
   */
  async findBetweenUsers(
    userId1: string,
    userId2: string,
  ): Promise<ChatRoomRequest | null> {
    return this.repo.findOne({
      where: [
        { requesterId: userId1, addresseeId: userId2 },
        { requesterId: userId2, addresseeId: userId1 },
      ],
      relations: ['requester', 'addressee'],
    });
  }

  /**
   * Find pending incoming chat room requests for a user
   */
  async findPendingIncomingRequests(
    userId: string,
  ): Promise<ChatRoomRequest[]> {
    return this.repo.find({
      where: {
        addresseeId: userId,
        status: ChatRoomRequestStatus.PENDING,
      },
      relations: ['requester'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update chat room request status
   */
  async updateStatus(
    id: string,
    status: ChatRoomRequestStatus,
  ): Promise<boolean> {
    const result = await this.repo.update(id, { status });
    return result.affected !== undefined && result.affected > 0;
  }

  /**
   * Reopen/reset an existing request for a new chat cycle.
   * - Reassigns requester/addressee (in case initiator flips)
   * - Sets status back to PENDING
   */
  async resetRequest(
    id: string,
    requesterId: string,
    addresseeId: string,
  ): Promise<ChatRoomRequest> {
    await this.repo.update(id, {
      requesterId,
      addresseeId,
      status: ChatRoomRequestStatus.PENDING,
      updatedAt: new Date(),
    });
    const updated = await this.findById(id);
    if (!updated) {
      // Fallback (should not happen): return minimal object to satisfy types
      return {
        id,
        requesterId,
        addresseeId,
        status: ChatRoomRequestStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ChatRoomRequest;
    }
    return updated;
  }

  /**
   * Check if chat room request exists between two users (any status)
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

