import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_KEYS, REDIS_TTL } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      throw new Error('REDIS_URL is not defined');
    }

    // Instantiate client; ioredis will handle connection lifecycle
    this.client = new Redis(redisUrl);

    this.client.on('ready', () => {
      this.logger.log('Redis connected successfully');
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`, err.stack);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (err) {
        this.logger.error(
          'Error while closing Redis connection',
          err instanceof Error ? err.stack : undefined,
        );
      }
    }
  }

  /**
   * Expose the singleton Redis client
   */
  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client;
  }

  /**
   * MATCHING QUEUE OPERATIONS
   */

  /**
   * Add user to matching queue with timestamp as score
   * @param userId User ID
   * @param profileData User's profile data (interests, hobbies, etc.)
   */
  async addToMatchingQueue(userId: string, profileData: any): Promise<void> {
    const client = this.getClient();
    const score = Date.now(); // Current timestamp as score
    const member = JSON.stringify({ userId, ...profileData });

    await client.zadd(REDIS_KEYS.MATCHING_QUEUE, score, member);
    this.logger.log(`User ${userId} added to matching queue`);
  }

  /**
   * Get all users in matching queue
   * @returns Array of user data with scores
   */
  async getMatchingQueue(): Promise<
    Array<{
      userId: string;
      interests: number[];
      hobbies: number[];
      techStack: number[];
      score: number;
    }>
  > {
    const client = this.getClient();

    // Get all members with scores
    const results = await client.zrange(
      REDIS_KEYS.MATCHING_QUEUE,
      0,
      -1,
      'WITHSCORES',
    );

    // Parse results (alternates between member and score)
    const queue: Array<{
      userId: string;
      interests: number[];
      hobbies: number[];
      techStack: number[];
      score: number;
    }> = [];
    for (let i = 0; i < results.length; i += 2) {
      const data = JSON.parse(results[i]) as {
        userId: string;
        interests: number[];
        hobbies: number[];
        techStack: number[];
      };
      const score = parseFloat(results[i + 1]);
      queue.push({ ...data, score });
    }

    return queue;
  }

  /**
   * Remove users from matching queue
   * @param userIds Array of user IDs to remove
   */
  async removeFromMatchingQueue(userIds: string[]): Promise<void> {
    const client = this.getClient();

    try {
      // Get all queue members
      const allMembers = await client.zrange(REDIS_KEYS.MATCHING_QUEUE, 0, -1);

      if (allMembers.length === 0) {
        this.logger.debug(`Queue is empty, nothing to remove`);
        return;
      }

      // Find members to remove
      const toRemove = allMembers.filter((member) => {
        try {
          const data = JSON.parse(member);
          return userIds.includes(data.userId);
        } catch (error) {
          this.logger.error(`Failed to parse queue member: ${member}`);
          return false;
        }
      });

      if (toRemove.length > 0) {
        await client.zrem(REDIS_KEYS.MATCHING_QUEUE, ...toRemove);
        this.logger.log(
          `✅ Removed ${toRemove.length} users from matching queue`,
        );
      } else {
        this.logger.warn(`⚠️ No users found to remove: ${userIds.join(', ')}`);
      }
    } catch (error) {
      this.logger.error(`Error removing from queue: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if user is in matching queue
   */
  async isInMatchingQueue(userId: string): Promise<boolean> {
    const queue = await this.getMatchingQueue();
    return queue.some((member) => member.userId === userId);
  }

  /**
   * Get queue size
   */
  async getQueueSize(): Promise<number> {
    const client = this.getClient();
    return client.zcard(REDIS_KEYS.MATCHING_QUEUE);
  }

  /**
   * ROOM OPERATIONS
   */

  /**
   * Set user's active room
   * @param userId User ID
   * @param roomId Room ID
   * @param ttl Time to live in seconds (default: 10 minutes)
   */
  async setUserRoom(
    userId: string,
    roomId: string,
    ttl = REDIS_TTL.USER_ROOM,
  ): Promise<void> {
    const client = this.getClient();
    const key = REDIS_KEYS.USER_ROOM(userId);

    await client.set(key, roomId, 'EX', ttl);
    this.logger.log(`User ${userId} joined room ${roomId}`);
  }

  /**
   * Get user's active room
   */
  async getUserRoom(userId: string): Promise<string | null> {
    const client = this.getClient();
    const key = REDIS_KEYS.USER_ROOM(userId);
    return client.get(key);
  }

  /**
   * Remove user from room
   */
  async removeUserRoom(userId: string): Promise<void> {
    const client = this.getClient();
    const key = REDIS_KEYS.USER_ROOM(userId);
    await client.del(key);
    this.logger.log(`User ${userId} left their room`);
  }

  /**
   * Set active room data (for tracking/cleanup)
   * @param roomId Room ID
   * @param roomData Room metadata
   * @param ttl Time to live in seconds
   */
  async setActiveRoom(
    roomId: string,
    roomData: any,
    ttl = REDIS_TTL.ACTIVE_ROOM,
  ): Promise<void> {
    const client = this.getClient();
    const key = REDIS_KEYS.ACTIVE_ROOM(roomId);

    await client.set(key, JSON.stringify(roomData), 'EX', ttl);
  }

  /**
   * Get active room data
   */
  async getActiveRoom(roomId: string): Promise<any | null> {
    const client = this.getClient();
    const key = REDIS_KEYS.ACTIVE_ROOM(roomId);
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Delete active room
   */
  async deleteActiveRoom(roomId: string): Promise<void> {
    const client = this.getClient();
    const key = REDIS_KEYS.ACTIVE_ROOM(roomId);
    await client.del(key);
  }

  /**
   * UTILITY METHODS
   */

  /**
   * Check if Redis is connected
   */
  async isConnected(): Promise<boolean> {
    try {
      const client = this.getClient();
      await client.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear matching queue (for testing/admin purposes)
   */
  async clearMatchingQueue(): Promise<void> {
    const client = this.getClient();
    await client.del(REDIS_KEYS.MATCHING_QUEUE);
    this.logger.warn('Matching queue cleared');
  }
}
