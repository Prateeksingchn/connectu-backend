import {
  WebSocketGateway as NestWebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WebSocketEvent } from './events/websocket.events';
import { JoinRoomDto } from './dto/join-room.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { ChatRoomRepository } from '../matching/repositories/chat-room.repository';
import { FriendChatRoomRepository } from '../friends/chat-rooms/repositories/friend-chat-room.repository';
import { ChatMessageService } from '../friends/chat-rooms/chat-message.service';
import { FriendChatRoomService } from '../friends/chat-rooms/friend-chat-room.service';
import { AnonymousIdentityService } from './services/anonymous-identity.service';
import { UsersRepository } from '../users/users.repository';

@NestWebSocketGateway({
  cors: {
    origin: 'http://localhost:3000', // frontend dev origin
    credentials: true,
  },
  namespace: '/', // Default namespace
})
export class WebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);

  // Store active connections: userId -> socketId
  private readonly userConnections = new Map<string, string>();

  // Store room memberships: roomId -> Set<userId>
  private readonly roomMemberships = new Map<string, Set<string>>();

  constructor(
    private readonly chatRoomRepository: ChatRoomRepository,
    private readonly friendChatRoomRepository: FriendChatRoomRepository,
    private readonly chatMessageService: ChatMessageService,
    private readonly friendChatRoomService: FriendChatRoomService,
    private readonly anonymousIdentityService: AnonymousIdentityService,
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Called when a client connects
   */
  async handleConnection(client: Socket): Promise<void> {
    this.logger.log(`[WebSocket] Client attempting connection: ${client.id}`);

    // Get token from handshake to validate
    const token =
      client.handshake?.auth?.token ||
      client.handshake?.headers?.authorization?.split(' ')[1] ||
      (client.handshake?.query?.token as string | undefined);

    if (!token) {
      this.logger.error(
        `[WebSocket] ❌ Connection rejected: No token provided`,
      );
      client.disconnect(true);
      return;
    }

    // Actually verify the token (same check WsJwtGuard performs per-handler) so an
    // invalid/expired token is rejected at connection time instead of staying
    // connected until the first guarded method call.
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      (client as any).userId = payload.sub;
      (client as any).email = payload.email;
      (client as any).role = payload.role;
    } catch (error) {
      this.logger.error(
        `[WebSocket] ❌ Connection rejected: invalid token (${(error as Error).message})`,
      );
      client.disconnect(true);
      return;
    }

    this.logger.log(
      `[WebSocket] ✅ Client connected with valid token: ${client.id}`,
    );

    // Send connection success event
    client.emit(WebSocketEvent.CONNECTION, {
      message: 'Connected to WebSocket server',
      socketId: client.id,
      timestamp: new Date(),
    });
  }

  /**
   * Called when a client disconnects
   */
  async handleDisconnect(client: Socket): Promise<void> {
    this.logger.log(`[WebSocket] Client disconnected: ${client.id}`);

    // Find and remove user from connections
    let disconnectedUserId: string | undefined;
    for (const [userId, socketId] of this.userConnections.entries()) {
      if (socketId === client.id) {
        this.userConnections.delete(userId);
        disconnectedUserId = userId;
        this.logger.log(`[WebSocket] User offline: ${userId}`);

        // Notify others that user went offline
        this.server.emit(WebSocketEvent.USER_OFFLINE, { userId });
        break;
      }
    }

    if (disconnectedUserId) {
      await this.removeUserFromRooms(disconnectedUserId);
    }
  }

  /**
   * Remove a user from every room they're a member of, notifying other members and
   * clearing anonymous-identity state as needed. Shared by handleDisconnect() and
   * disconnectUser()'s no-live-socket fallback so the two cleanup paths can't drift
   * out of sync with each other.
   */
  private async removeUserFromRooms(userId: string): Promise<void> {
    for (const [roomId, members] of this.roomMemberships.entries()) {
      if (!members.has(userId)) {
        continue;
      }
      members.delete(userId);

      // Get display name (real name for friend rooms, anonymous for matching rooms)
      const isFriendRoom = await this.isFriendChatRoom(roomId);
      let displayName: string | null = null;

      if (isFriendRoom) {
        const user = await this.usersRepository.findById(userId);
        displayName = user ? user.name : null;
      } else {
        displayName = this.anonymousIdentityService.getAnonymousName(
          roomId,
          userId,
        );
        // Remove anonymous identity for matching rooms
        if (displayName) {
          this.anonymousIdentityService.removeAnonymousName(roomId, userId);
        }
      }

      // Notify room members
      if (displayName) {
        this.server.to(roomId).emit(WebSocketEvent.USER_LEFT, {
          anonymousName: displayName,
          senderName: displayName,
          roomId,
          timestamp: new Date(),
        });
      }

      if (members.size === 0) {
        this.roomMemberships.delete(roomId);
        // Clean up all anonymous identities for matching rooms only
        if (!isFriendRoom) {
          this.anonymousIdentityService.clearRoomIdentities(roomId);
        }
      }
    }
  }

  /**
   * User registers their connection (after JWT auth)
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage(WebSocketEvent.USER_ONLINE)
  handleUserOnline(@ConnectedSocket() client: Socket): void {
    const userId = (client as any).userId as string; // Set by WsJwtGuard from JWT

    // Store user connection
    this.userConnections.set(userId, client.id);

    this.logger.log(`User registered: ${userId} -> ${client.id}`);

    // Confirm to user
    client.emit(WebSocketEvent.USER_ONLINE, {
      message: 'Successfully registered',
      userId,
    });
  }

  /**
   * Join a chat room
   * NOTE: No need to send socketId - userId is extracted from JWT token
   */
  @UseGuards(WsJwtGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage(WebSocketEvent.JOIN_ROOM)
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinRoomDto,
  ): Promise<void> {
    const { roomId } = dto;
    const userId = (client as any).userId as string; // Set by WsJwtGuard from JWT

    this.logger.log(
      `[JOIN_ROOM] User ${userId.substring(0, 8)} attempting to join ${roomId.substring(0, 8)}`,
    );

    // Check if room is active and not expired (server-side)
    const chatRoom = await this.ensureRoomActive(roomId, client);
    if (!chatRoom) {
      return;
    }

    // Join Socket.io room
    client.join(roomId);

    // Track room membership
    if (!this.roomMemberships.has(roomId)) {
      this.roomMemberships.set(roomId, new Set());
    }
    this.roomMemberships.get(roomId)!.add(userId);

    // Get display name (real name for friend rooms, anonymous for matching rooms)
    const displayName = await this.getDisplayName(roomId, userId);

    this.logger.log(
      `[JOIN_ROOM] ✅ User ${userId.substring(0, 8)} joined room ${roomId.substring(0, 8)} as "${displayName}"`,
    );

    // Notify user (confirmation)
    client.emit(WebSocketEvent.JOIN_ROOM, {
      message: 'Joined room successfully',
      roomId,
      anonymousName: displayName,
      senderName: displayName,
      timestamp: new Date(),
    });

    // Notify other room members
    client.to(roomId).emit(WebSocketEvent.USER_JOINED, {
      anonymousName: displayName,
      senderName: displayName,
      roomId,
      timestamp: new Date(),
    });
  }

  /**
   * Leave a chat room
   */
  @UseGuards(WsJwtGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage(WebSocketEvent.LEAVE_ROOM)
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinRoomDto,
  ): Promise<void> {
    const { roomId } = dto;
    const userId = (client as any).userId as string;

    // Leave Socket.io room
    client.leave(roomId);

    // Remove from room membership
    if (this.roomMemberships.has(roomId)) {
      const members = this.roomMemberships.get(roomId)!;
      members.delete(userId);

      if (members.size === 0) {
        this.roomMemberships.delete(roomId);
        // Clean up all anonymous identities for this room
        this.anonymousIdentityService.clearRoomIdentities(roomId);
      }
    }

    // Get display name before removing it
    const displayName = await this.getDisplayName(roomId, userId);

    // Remove anonymous identity (only for matching rooms)
    const isFriendRoom = await this.isFriendChatRoom(roomId);
    if (!isFriendRoom) {
      this.anonymousIdentityService.removeAnonymousName(roomId, userId);
    }

    this.logger.log(
      `User ${userId.substring(0, 8)} (${displayName}) left room ${roomId.substring(0, 8)}`,
    );

    // Notify user
    client.emit(WebSocketEvent.LEAVE_ROOM, {
      message: 'Left room successfully',
      roomId,
    });

    // Notify other room members
    client.to(roomId).emit(WebSocketEvent.USER_LEFT, {
      anonymousName: displayName,
      senderName: displayName,
      roomId,
      timestamp: new Date(),
    });
  }

  /**
   * Send message to room
   */
  @UseGuards(WsJwtGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage(WebSocketEvent.SEND_MESSAGE)
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ): Promise<void> {
    try {
      // Basic defensive validation in case DTO/ValidationPipe fails unexpectedly
      if (!dto || typeof dto !== 'object') {
        this.logger.warn('[SEND_MESSAGE] ❌ Invalid payload (no body)');
        client.emit(WebSocketEvent.ERROR, {
          message: 'Invalid message payload',
        });
        return;
      }

      const { roomId, message } = dto;

      if (
        !roomId ||
        typeof roomId !== 'string' ||
        !message ||
        typeof message !== 'string'
      ) {
        this.logger.warn('[SEND_MESSAGE] ❌ Invalid payload structure', {
          roomId,
          message,
        });
        client.emit(WebSocketEvent.ERROR, {
          message: 'Invalid message payload',
        });
        return;
      }

      const userId = (client as any).userId as string;

      // Check if room is active and not expired (server-side)
      const chatRoom = await this.ensureRoomActive(roomId, client);
      if (!chatRoom) {
        // ensureRoomActive already emitted a descriptive error (if not silent)
        return;
      }

      // Get display name for sender (real name for friend rooms, anonymous for matching rooms)
      const senderDisplayName = await this.getDisplayName(roomId, userId);

      if (!senderDisplayName) {
        this.logger.warn(
          `[SEND_MESSAGE] ❌ No display name found for user ${userId.substring(0, 8)} in room ${roomId.substring(0, 8)}`,
        );
        client.emit(WebSocketEvent.ERROR, {
          message: 'You must join the room before sending messages',
        });
        return;
      }

      // Persist only for friend chat rooms - anonymous matching chat rooms must
      // remain fully ephemeral. This is a runtime check (not type-enforced), so
      // it must gate the persistence call directly rather than being inferred
      // from anything else in this handler.
      const isFriendRoom = await this.isFriendChatRoom(roomId);
      if (isFriendRoom) {
        await this.chatMessageService.saveMessage(roomId, userId, message);
        await this.friendChatRoomService.updateLastMessage(roomId, message);
      }

      // Message payload - includes display name (real or anonymous)
      const messageData = {
        roomId,
        senderName: senderDisplayName,
        message,
        timestamp: new Date(),
      };

      this.logger.log(
        `Message in room ${roomId.substring(0, 8)} from "${senderDisplayName}" (${userId.substring(0, 8)})`,
      );

      // Broadcast to all users in room (including sender)
      this.server.to(roomId).emit(WebSocketEvent.NEW_MESSAGE, messageData);
    } catch (error) {
      // Never throw from WebSocket handler; always emit a socket error event
      this.logger.error(
        '[SEND_MESSAGE] ❌ Unexpected error while sending message',
        error,
      );
      client.emit(WebSocketEvent.ERROR, {
        message: 'Failed to send message due to a server error',
      });
    }
  }

  /**
   * User is typing in room
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage(WebSocketEvent.TYPING)
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    const { roomId } = data;
    const userId = (client as any).userId as string;

    // Check if room is active and not expired
    const chatRoom = await this.ensureRoomActive(roomId, client, {
      silent: true,
    });
    if (!chatRoom) {
      return;
    }

    // Get display name (real name for friend rooms, anonymous for matching rooms)
    const displayName = await this.getDisplayName(roomId, userId);

    // Notify other users in room (not sender)
    client.to(roomId).emit(WebSocketEvent.TYPING, {
      anonymousName: displayName,
      senderName: displayName,
      roomId,
    });
  }

  /**
   * User stopped typing
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage(WebSocketEvent.STOP_TYPING)
  async handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    const { roomId } = data;
    const userId = (client as any).userId as string;

    // Check if room is active and not expired
    const chatRoom = await this.ensureRoomActive(roomId, client, {
      silent: true,
    });
    if (!chatRoom) {
      return;
    }

    // Get display name (real name for friend rooms, anonymous for matching rooms)
    const displayName = await this.getDisplayName(roomId, userId);
    if (!displayName) {
      return;
    }

    // Notify other users
    client.to(roomId).emit(WebSocketEvent.STOP_TYPING, {
      anonymousName: displayName,
      senderName: displayName,
      roomId,
    });
  }

  /**
   * Public method to emit events from other services to a specific user
   */
  emitToUser(userId: string, event: WebSocketEvent, data: any): boolean {
    const socketId = this.userConnections.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  /**
   * Emit to entire room
   */
  emitToRoom(roomId: string, event: WebSocketEvent, data: any): void {
    this.server.to(roomId).emit(event, data);
  }

  /**
   * Get active users in room
   */
  getRoomMembers(roomId: string): Set<string> | undefined {
    return this.roomMemberships.get(roomId);
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userConnections.has(userId);
  }

  /**
   * How many users currently hold a live socket on this process. Aggregate
   * only - callers (e.g. the /matching/stats presence counter) must not be
   * able to derive *who* is online from it. Like the map it reads, this
   * rebuilds from scratch on restart.
   */
  getOnlineUserCount(): number {
    return this.userConnections.size;
  }

  /**
   * Get socket ID for a user
   */
  getUserSocketId(userId: string): string | undefined {
    return this.userConnections.get(userId);
  }

  /**
   * Get the Socket.io server instance
   */
  getServer(): Server {
    return this.server;
  }

  /**
   * Remove room membership tracking
   */
  removeRoomMembership(roomId: string): void {
    this.roomMemberships.delete(roomId);
  }

  /**
   * Force-disconnect a user's socket (if currently connected) and drop any
   * in-memory connection/room-membership state for them. Used when a user
   * account is deleted so no stale gateway state outlives the user row.
   * When there's a live socket, handleDisconnect() performs the actual
   * room/anonymous-identity cleanup once the socket disconnect event fires.
   * When there isn't (stale tracking, socket already gone), no disconnect
   * event will ever fire for it, so the fallback below replicates that same
   * cleanup - room membership, anonymous identities, and the USER_LEFT
   * notification to other room members - via removeUserFromRooms().
   */
  disconnectUser(userId: string): void {
    const socketId = this.userConnections.get(userId);
    if (!socketId) {
      return;
    }

    // `server.sockets` is typed as a Namespace, but with `namespace: '/'` configured on this
    // gateway, Nest injects the namespace itself here - whose own `.sockets` is the
    // Map<SocketId, Socket> of connected sockets, not `server.sockets.sockets`.
    const sockets = this.server?.sockets as unknown as
      | Map<string, Socket>
      | undefined;
    const socket = sockets?.get(socketId);
    if (socket) {
      socket.disconnect(true);
    } else {
      // No live socket object (e.g. already gone) - clear tracking directly and
      // run the same room/identity cleanup handleDisconnect() would have done.
      this.userConnections.delete(userId);
      this.removeUserFromRooms(userId).catch((error) => {
        this.logger.error(
          `[WebSocket] Failed to clean up room state for disconnected user ${userId}: ${(error as Error).message}`,
        );
      });
    }
  }

  /**
   * Check if a room is a friend chat room
   */
  private async isFriendChatRoom(roomId: string): Promise<boolean> {
    const friendRoom =
      await this.friendChatRoomRepository.findValidActiveRoom(roomId);
    return friendRoom !== null;
  }

  /**
   * Get display name for a user in a room
   * Returns real name for friend rooms, anonymous name for matching rooms
   */
  private async getDisplayName(
    roomId: string,
    userId: string,
  ): Promise<string> {
    const isFriendRoom = await this.isFriendChatRoom(roomId);

    if (isFriendRoom) {
      // For friend rooms, use real name
      const user = await this.usersRepository.findById(userId);
      return user ? user.name : 'Unknown';
    } else {
      // For matching rooms, use anonymous name
      let anonymousName = this.anonymousIdentityService.getAnonymousName(
        roomId,
        userId,
      );
      if (!anonymousName) {
        anonymousName = this.anonymousIdentityService.assignAnonymousName(
          roomId,
          userId,
        );
      }
      return anonymousName;
    }
  }

  /**
   * Ensure a room exists, is active, and not past expiresAt.
   * Checks both matching chat rooms and friend chat rooms.
   * If expired, mark inactive and emit an error to the requesting client.
   */
  private async ensureRoomActive(
    roomId: string,
    client: Socket,
    options?: { silent?: boolean },
  ): Promise<any> {
    const silent = options?.silent ?? false;

    // First check matching chat rooms
    let room: any = await this.chatRoomRepository.findValidActiveRoom(roomId);

    // If not found, check friend chat rooms
    if (!room) {
      room = await this.friendChatRoomRepository.findValidActiveRoom(roomId);
    }

    if (!room) {
      if (!silent) {
        this.logger.warn(
          `[ROOM_CHECK] ❌ Room ${roomId.substring(0, 8)} not found or expired`,
        );
        client.emit(WebSocketEvent.ERROR, {
          message: 'Chat room has expired or does not exist',
          roomId,
        });
      }
      return null;
    }

    return room;
  }
}
