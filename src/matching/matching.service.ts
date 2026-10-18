import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  forwardRef,
} from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { UsersRepository } from '../users/users.repository';
import { ChatRoomRepository } from './repositories/chat-room.repository';
import { AlgorithmService } from './algorithm.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { WebSocketEvent } from '../websocket/events/websocket.events';
import { AnonymousIdentityService } from '../websocket/services/anonymous-identity.service';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);
  private readonly WAIT_TIME_MS = 2 * 60 * 1000; // 2 minutes

  constructor(
    private readonly redisService: RedisService,
    private readonly usersRepository: UsersRepository,
    private readonly chatRoomRepository: ChatRoomRepository,
    private readonly algorithmService: AlgorithmService,
    @Inject(forwardRef(() => WebSocketGateway))
    private readonly wsGateway: WebSocketGateway,
    private readonly anonymousIdentityService: AnonymousIdentityService,
  ) {}

  /**
   * Add user to matching queue and wait for scheduler to find match
   */
  async joinQueue(userId: string) {
    this.logger.log(`User ${userId} attempting to join matching queue`);

    // 1. Check if user already in queue
    const alreadyInQueue = await this.redisService.isInMatchingQueue(userId);
    if (alreadyInQueue) {
      throw new ConflictException('You are already in the matching queue');
    }

    // 2. Check if user is in active chat room
    // findActiveByUserId() is expiry-aware (self-heals a stale isActive flag), so a
    // non-null result here is genuinely still active, not just not-yet-swept.
    const activeRoom = await this.chatRoomRepository.findActiveByUserId(userId);
    if (activeRoom) {
      throw new ConflictException('You are already in an active chat room');
    }

    // 3. Get user's profile data
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // 4. Extract matching data
    const profileData = {
      userId: user.id,
      interests: user.interests?.map((i) => i.id) || [],
      hobbies: user.hobbies?.map((h) => h.id) || [],
      techStack: user.techStack?.map((t) => t.id) || [],
    };

    // 5. Add to Redis queue
    await this.redisService.addToMatchingQueue(userId, profileData);

    this.logger.log(`User ${userId} added to queue`);

    // 6. Return waiting response (no immediate match attempt)
    const queueSize = await this.redisService.getQueueSize();
    this.logger.log(`Current queue size: ${queueSize}`);

    return {
      message:
        'Added to matching queue. Finding best match... (may take up to 2 minutes)',
      queueSize,
      estimatedWaitTime: '2 minutes',
    };
  }

  /**
   * Get users from queue who have been waiting >= 2 minutes
   */
  private async getReadyUsers(): Promise<
    Array<{
      userId: string;
      interests: number[];
      hobbies: number[];
      techStack: number[];
      score: number;
    }>
  > {
    const queue = await this.redisService.getMatchingQueue();
    const now = Date.now();

    // Filter users who have been waiting >= 2 minutes
    return queue.filter((user) => {
      const waitTime = now - user.score;
      return waitTime >= this.WAIT_TIME_MS;
    });
  }

  /**
   * Find match for the given user (called by scheduler)
   * Only matches users who have been waiting >= 2 minutes
   */
  private async findMatch(userId: string, userProfile: any) {
    // Get only ready users (waiting >= 2 minutes)
    const readyUsers = await this.getReadyUsers();

    this.logger.log(
      `Finding match for ${userId} among ${readyUsers.length} ready users`,
    );

    // Filter out current user and transform to UserProfile format
    const candidates = readyUsers
      .filter((u) => u.userId !== userId)
      .map((u) => ({
        userId: u.userId,
        interests: u.interests || [],
        hobbies: u.hobbies || [],
        techStack: u.techStack || [],
      }));

    if (candidates.length === 0) {
      this.logger.log('No ready candidates available');
      return null;
    }

    // If exactly one candidate, match immediately
    if (candidates.length === 1) {
      const match = readyUsers.find((u) => u.userId === candidates[0].userId);
      this.logger.log(`Only 2 ready users - matching immediately`);
      return this.createMatch(userProfile, match, 0); // Score irrelevant
    }

    // Multiple candidates - use algorithm
    const bestMatch = this.algorithmService.findBestMatch(
      userProfile,
      candidates,
    );

    if (!bestMatch) {
      return null;
    }

    return this.createMatch(userProfile, bestMatch.match, bestMatch.score);
  }

  /**
   * Find best match for a user among candidate users
   * Public method used by scheduler for matching ready users
   */
  async findBestMatchForUser(
    user: any,
    candidates: Array<{
      userId: string;
      interests: number[];
      hobbies: number[];
      techStack: number[];
      score: number;
    }>,
  ): Promise<{
    score: number;
    match: {
      userId: string;
      interests: number[];
      hobbies: number[];
      techStack: number[];
    };
    roomId: string;
  } | null> {
    if (candidates.length === 0) {
      return null;
    }

    const userProfile = {
      userId: user.userId,
      interests: user.interests || [],
      hobbies: user.hobbies || [],
      techStack: user.techStack || [],
    };

    const candidateProfiles = candidates.map((c) => ({
      userId: c.userId,
      interests: c.interests || [],
      hobbies: c.hobbies || [],
      techStack: c.techStack || [],
    }));

    // Use existing algorithm to find best match
    const bestMatch = this.algorithmService.findBestMatch(
      userProfile,
      candidateProfiles,
    );

    if (!bestMatch) {
      return null;
    }

    // Find full candidate data
    const matchedCandidate = candidates.find(
      (c) => c.userId === bestMatch.match.userId,
    );

    // Create match
    const match = await this.createMatch(
      user,
      matchedCandidate,
      bestMatch.score,
    );

    return {
      score: bestMatch.score,
      match: bestMatch.match,
      roomId: match.roomId,
    };
  }

  /**
   * Create chat room and notify users
   */
  private async createMatch(user1: any, user2: any, score: number) {
    this.logger.log(
      `Creating match between ${user1.userId} and ${user2.userId} (score: ${score})`,
    );

    // 1. Remove both users from queue
    await this.redisService.removeFromMatchingQueue([
      user1.userId,
      user2.userId,
    ]);

    // 2. Create chat room in database
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const chatRoom = await this.chatRoomRepository.create({
      user1Id: user1.userId,
      user2Id: user2.userId,
      matchScore: score,
      expiresAt,
      isActive: true, // Explicitly set to true
    });

    this.logger.log(`Chat room created: ${chatRoom.id}`);

    // 3. Store room info in Redis (for quick lookup)
    await this.redisService.setActiveRoom(
      chatRoom.id,
      {
        user1Id: user1.userId,
        user2Id: user2.userId,
        matchScore: score,
        createdAt: new Date(),
      },
      600, // 10 minutes TTL
    );

    // 4. Track which room each user is in
    await this.redisService.setUserRoom(user1.userId, chatRoom.id, 600);
    await this.redisService.setUserRoom(user2.userId, chatRoom.id, 600);

    // 5. Assign both pseudonyms up front so MATCH_FOUND can name who you
    // matched with (the frontend shows a short reveal before redirecting
    // into the room). assignAnonymousName() is idempotent per room+user, so
    // the gateway's own call on JOIN_ROOM returns these same names rather
    // than minting different ones.
    const user1AnonymousName =
      this.anonymousIdentityService.assignAnonymousName(
        chatRoom.id,
        user1.userId,
      );
    const user2AnonymousName =
      this.anonymousIdentityService.assignAnonymousName(
        chatRoom.id,
        user2.userId,
      );

    // 6. Notify both users via WebSocket
    const matchData = {
      roomId: chatRoom.id,
      matchScore: score,
      expiresAt: chatRoom.expiresAt,
    };

    const user1Sent = this.wsGateway.emitToUser(
      user1.userId,
      WebSocketEvent.MATCH_FOUND,
      {
        ...matchData,
        otherUserId: user2.userId,
        anonymousName: user1AnonymousName,
        otherAnonymousName: user2AnonymousName,
        message: 'Match found! Joining chat room...',
      },
    );

    const user2Sent = this.wsGateway.emitToUser(
      user2.userId,
      WebSocketEvent.MATCH_FOUND,
      {
        ...matchData,
        otherUserId: user1.userId,
        anonymousName: user2AnonymousName,
        otherAnonymousName: user1AnonymousName,
        message: 'Match found! Joining chat room...',
      },
    );

    this.logger.log(
      `Match notifications sent: User1 (${user1.userId.substring(0, 8)}) ${user1Sent ? '✅' : '❌'}, User2 (${user2.userId.substring(0, 8)}) ${user2Sent ? '✅' : '❌'}`,
    );

    return {
      roomId: chatRoom.id,
      matchScore: score,
    };
  }

  /**
   * Remove user from queue (if they cancel)
   */
  async leaveQueue(userId: string) {
    this.logger.log(
      `[LEAVE_QUEUE] User ${userId.substring(0, 8)} attempting to leave queue`,
    );

    const inQueue = await this.redisService.isInMatchingQueue(userId);

    if (!inQueue) {
      this.logger.warn(
        `[LEAVE_QUEUE] ⚠️ User ${userId.substring(0, 8)} not in queue`,
      );
      throw new BadRequestException('You are not in the matching queue');
    }

    await this.redisService.removeFromMatchingQueue([userId]);

    this.logger.log(
      `[LEAVE_QUEUE] ✅ User ${userId.substring(0, 8)} left matching queue`,
    );

    return { message: 'Left matching queue successfully' };
  }

  /**
   * Clear all users from queue (Admin/Testing only)
   */
  async clearAllUsersFromQueue() {
    this.logger.warn(`[ADMIN] Clearing all users from matching queue`);

    const queue = await this.redisService.getMatchingQueue();
    const userCount = queue.length;

    await this.redisService.clearMatchingQueue();

    this.logger.warn(`[ADMIN] ✅ Cleared ${userCount} users from queue`);

    return {
      message: `Cleared ${userCount} users from queue`,
      usersCleared: userCount,
    };
  }

  async endActiveChatRoom(id: string, userId: string) {
    // Get chat room to verify user is a participant
    const chatRoom = await this.chatRoomRepository.findById(id);

    if (!chatRoom) {
      throw new BadRequestException('Chat room not found');
    }

    // Verify user is part of this chat room
    if (chatRoom.user1Id !== userId && chatRoom.user2Id !== userId) {
      throw new BadRequestException(
        'You are not authorized to end this chat room',
      );
    }

    // End the chat room
    await this.chatRoomRepository.endActiveChatRoom(
      id,
      chatRoom.user1Id,
      chatRoom.user2Id,
    );

    // Remove from Redis
    await this.redisService.removeUserRoom(chatRoom.user1Id);
    await this.redisService.removeUserRoom(chatRoom.user2Id);
    await this.redisService.deleteActiveRoom(id);

    // Pseudonyms outlive leave/disconnect (they're pre-assigned at match
    // time), so ending the room is where they get released.
    this.anonymousIdentityService.clearRoomIdentities(id);

    this.logger.log(`Chat room ${id} ended by user ${userId}`);

    return { message: 'Chat room ended successfully' };
  }

  /**
   * Expire a chat room (idempotent)
   * Handles cleanup: database, Redis, WebSocket room, and notifications
   */
  async expireChatRoom(roomId: string): Promise<boolean> {
    // Check if room is already expired (idempotent check)
    const chatRoom = await this.chatRoomRepository.findById(roomId);

    if (!chatRoom) {
      this.logger.warn(`[EXPIRE] Room ${roomId.substring(0, 8)} not found`);
      return false;
    }

    if (!chatRoom.isActive) {
      this.logger.debug(
        `[EXPIRE] Room ${roomId.substring(0, 8)} already expired`,
      );
      return false;
    }

    // Mark as inactive in database (idempotent - only updates if isActive=true)
    const wasUpdated = await this.chatRoomRepository.expireRoom(roomId);

    if (!wasUpdated) {
      this.logger.debug(
        `[EXPIRE] Room ${roomId.substring(0, 8)} already expired (race condition)`,
      );
      return false;
    }

    this.logger.log(`[EXPIRE] ✅ Expiring room ${roomId.substring(0, 8)}`);

    // Remove from Redis (idempotent - safe to call multiple times)
    await this.redisService.removeUserRoom(chatRoom.user1Id);
    await this.redisService.removeUserRoom(chatRoom.user2Id);
    await this.redisService.deleteActiveRoom(roomId);

    // Force all connected sockets to leave the room
    const roomMembers = this.wsGateway.getRoomMembers(roomId);
    if (roomMembers) {
      // Get all socket IDs for users in the room
      const socketIds: string[] = [];
      for (const userId of roomMembers) {
        const socketId = this.wsGateway.getUserSocketId(userId);
        if (socketId) {
          socketIds.push(socketId);
        }
      }

      // Force leave Socket.io room for all connected sockets
      // `server` here is the default-namespace object (see WebSocketGateway's
      // `namespace: '/'` config), whose own `.sockets` is already the
      // Map<SocketId, Socket> of connected sockets - not `server.sockets.sockets`.
      const server = this.wsGateway.getServer();
      for (const socketId of socketIds) {
        const socket = (server.sockets as unknown as Map<string, any>).get(
          socketId,
        );
        if (socket) {
          socket.leave(roomId);
        }
      }

      // Clear room membership tracking
      this.wsGateway.removeRoomMembership(roomId);
    }

    // Clear all anonymous identities for this room
    this.anonymousIdentityService.clearRoomIdentities(roomId);

    // Emit expiration event to all participants
    this.wsGateway.emitToRoom(roomId, WebSocketEvent.CHAT_EXPIRED, {
      roomId,
      message: 'Chat room has expired',
      timestamp: new Date(),
    });

    // Also send to individual users if they're online
    this.wsGateway.emitToUser(chatRoom.user1Id, WebSocketEvent.CHAT_EXPIRED, {
      roomId,
      message: 'Chat room has expired',
      timestamp: new Date(),
    });

    this.wsGateway.emitToUser(chatRoom.user2Id, WebSocketEvent.CHAT_EXPIRED, {
      roomId,
      message: 'Chat room has expired',
      timestamp: new Date(),
    });

    this.logger.log(
      `[EXPIRE] ✅ Room ${roomId.substring(0, 8)} expired and cleaned up`,
    );

    return true;
  }

  /**
   * Return the caller's currently active anonymous chat room, if any - lets a
   * tab that doesn't know which room it's in (fresh tab, or a hard refresh
   * that wiped in-memory frontend state) recover it from the backend.
   * Reuses findActiveByUserId(), which is already expiry-aware/self-healing.
   */
  async getActiveRoom(userId: string): Promise<{
    roomId: string;
    otherUserId: string;
    matchScore: number | null;
    expiresAt: Date | null;
  } | null> {
    const room = await this.chatRoomRepository.findActiveByUserId(userId);

    if (!room) {
      return null;
    }

    const otherUserId = room.user1Id === userId ? room.user2Id : room.user1Id;

    return {
      roomId: room.id,
      otherUserId,
      matchScore: room.matchScore ?? null,
      expiresAt: room.expiresAt ?? null,
    };
  }

  /**
   * Aggregate presence/queue counters for the Discover screen's "N people
   * online now" pill.
   *
   * Deliberately counts only - no user ids, names, or any value a caller
   * could use to identify who is queued or connected. usersOnline reads the
   * gateway's in-memory connection map, so it reflects *this* process and
   * resets on restart; that's acceptable for an ambient liveness hint and
   * avoids inventing a second source of truth for presence.
   */
  async getStats(): Promise<{ usersInQueue: number; usersOnline: number }> {
    const usersInQueue = await this.redisService.getQueueSize();

    return {
      usersInQueue,
      usersOnline: this.wsGateway.getOnlineUserCount(),
    };
  }

  /**
   * Check if a chat room is active and not expired
   */
  async isRoomActive(roomId: string): Promise<boolean> {
    const chatRoom = await this.chatRoomRepository.findById(roomId);

    if (!chatRoom) {
      return false;
    }

    // Check if room is marked as active
    if (!chatRoom.isActive) {
      return false;
    }

    // Check if room has expired (expiresAt <= now)
    if (chatRoom.expiresAt && chatRoom.expiresAt <= new Date()) {
      // Room expired but not yet marked inactive - expire it now
      await this.expireChatRoom(roomId);
      return false;
    }

    return true;
  }
}
