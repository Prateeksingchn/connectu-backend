import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ChatRoomRequestRepository } from './repositories/chat-room-request.repository';
import { ChatRoomRequestStatus } from './entities/chat-room-request-status.enum';
import { CreateChatRoomRequestDto } from './dto/create-chat-room-request.dto';
import { RespondChatRoomRequestDto } from './dto/respond-chat-room-request.dto';
import { FriendshipRepository } from '../friendships/repositories/friendship.repository';
import { FriendshipStatus } from '../friendships/entities/friendship-status.enum';
import { FriendChatRoomRepository } from './repositories/friend-chat-room.repository';
import { WebSocketGateway } from '../../websocket/websocket.gateway';
import { WebSocketEvent } from '../../websocket/events/websocket.events';

@Injectable()
export class ChatRoomRequestService {
  private readonly logger = new Logger(ChatRoomRequestService.name);

  constructor(
    private readonly chatRoomRequestRepository: ChatRoomRequestRepository,
    private readonly friendshipRepository: FriendshipRepository,
    private readonly friendChatRoomRepository: FriendChatRoomRepository,
    private readonly wsGateway: WebSocketGateway,
  ) {}

  /**
   * Create a chat room request with a friend
   * Rules:
   * - Users must be accepted friends
   * - Cannot create request if there's already an active friend chat room
   * - Cannot create duplicate pending request
   */
  async createChatRoomRequest(
    requesterId: string,
    friendId: string,
  ): Promise<{ message: string; requestId: string }> {
    // Rule 1: Check if users are accepted friends
    const friendship = await this.friendshipRepository.findBetweenUsers(
      requesterId,
      friendId,
    );

    if (!friendship || friendship.status !== FriendshipStatus.ACCEPTED) {
      throw new ForbiddenException(
        'You can only create chat room requests with accepted friends',
      );
    }

    // Rule 2: Check if there's already an active friend chat room
    const activeFriendRoom =
      await this.friendChatRoomRepository.findActiveByUserIdAndFriendId(
        requesterId,
        friendId,
      );
    if (activeFriendRoom) {
      throw new ConflictException(
        'Cannot create chat room request while friend chat room is active',
      );
    }

    // Rule 3: Check if there's already a pending request
    const existingRequest =
      await this.chatRoomRequestRepository.findBetweenUsers(
        requesterId,
        friendId,
      );

    if (existingRequest) {
      // Reopen/reset any existing request (pending/accepted/rejected) for a new cycle
      const reset = await this.chatRoomRequestRepository.resetRequest(
        existingRequest.id,
        requesterId,
        friendId,
      );

      this.logger.log(
        `Chat room request reopened: ${requesterId.substring(0, 8)} -> ${friendId.substring(0, 8)} (req: ${reset.id.substring(0, 8)})`,
      );

      // Notify the friend via WebSocket
      this.wsGateway.emitToUser(
        friendId,
        WebSocketEvent.CHAT_ROOM_REQUEST_RECEIVED,
        {
          requestId: reset.id,
          requesterId: requesterId,
          message: 'You have received a chat room request',
        },
      );

      return {
        message: 'Chat room request sent successfully',
        requestId: reset.id,
      };
    }

    // Create chat room request
    const request = await this.chatRoomRequestRepository.create({
      requesterId,
      addresseeId: friendId,
      status: ChatRoomRequestStatus.PENDING,
    });

    this.logger.log(
      `Chat room request sent: ${requesterId.substring(0, 8)} -> ${friendId.substring(0, 8)}`,
    );

    // Notify the friend via WebSocket
    this.wsGateway.emitToUser(
      friendId,
      WebSocketEvent.CHAT_ROOM_REQUEST_RECEIVED,
      {
        requestId: request.id,
        requesterId: requesterId,
        message: 'You have received a chat room request',
      },
    );

    return {
      message: 'Chat room request sent successfully',
      requestId: request.id,
    };
  }

  /**
   * Respond to a chat room request (accept or reject)
   * Rules:
   * - Only addressee can respond
   * - Request must be PENDING
   * - If accepted, create the friend chat room and notify both users
   */
  async respondToChatRoomRequest(
    addresseeId: string,
    dto: RespondChatRoomRequestDto,
  ): Promise<{ message: string; roomId?: string }> {
    const { requestId, status } = dto;

    // Find request
    const request = await this.chatRoomRequestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException('Chat room request not found');
    }

    // Rule: Only addressee can respond
    if (request.addresseeId !== addresseeId) {
      throw new ForbiddenException(
        'Only the recipient can respond to chat room requests',
      );
    }

    // Update status
    const updated = await this.chatRoomRequestRepository.updateStatus(
      requestId,
      status,
    );

    if (!updated) {
      throw new BadRequestException('Failed to update chat room request');
    }

    this.logger.log(
      `Chat room request ${status.toLowerCase()}: ${request.requesterId.substring(0, 8)} <-> ${addresseeId.substring(0, 8)}`,
    );

    // If accepted, create the friend chat room
    if (status === ChatRoomRequestStatus.ACCEPTED) {
      // Get the friendship to link the room
      const friendship = await this.friendshipRepository.findBetweenUsers(
        request.requesterId,
        addresseeId,
      );

      if (!friendship) {
        throw new BadRequestException('Friendship not found');
      }

      // Create friend chat room (no expiration - friends can chat indefinitely)
      const friendChatRoom = await this.friendChatRoomRepository.create({
        friendshipId: friendship.id,
        user1Id: request.requesterId,
        user2Id: addresseeId,
        isActive: true,
      });

      this.logger.log(
        `Friend chat room created: ${request.requesterId.substring(0, 8)} <-> ${addresseeId.substring(0, 8)} (room: ${friendChatRoom.id.substring(0, 8)})`,
      );

      // Notify both users via WebSocket
      this.wsGateway.emitToUser(
        request.requesterId,
        WebSocketEvent.CHAT_ROOM_CREATED,
        {
          roomId: friendChatRoom.id,
          friendId: addresseeId,
          message: 'Chat room created! You can now start chatting.',
        },
      );

      this.wsGateway.emitToUser(addresseeId, WebSocketEvent.CHAT_ROOM_CREATED, {
        roomId: friendChatRoom.id,
        friendId: request.requesterId,
        message: 'Chat room created! You can now start chatting.',
      });

      return {
        message: 'Chat room request accepted and room created successfully',
        roomId: friendChatRoom.id,
      };
    }

    // If rejected, just notify the requester
    this.wsGateway.emitToUser(
      request.requesterId,
      WebSocketEvent.CHAT_ROOM_REQUEST_REJECTED,
      {
        requestId: request.id,
        message: 'Your chat room request was rejected',
      },
    );

    return {
      message: `Chat room request ${status.toLowerCase()} successfully`,
    };
  }

  /**
   * Get list of pending incoming chat room requests
   */
  async getPendingChatRoomRequests(userId: string): Promise<any[]> {
    const requests =
      await this.chatRoomRequestRepository.findPendingIncomingRequests(userId);

    return requests.map((request) => ({
      requestId: request.id,
      requester: {
        id: request.requester.id,
        name: request.requester.name,
        email: request.requester.email,
      },
      createdAt: request.createdAt,
    }));
  }
}
