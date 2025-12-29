import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MatchingService } from './matching.service';
import { RedisService } from '../redis/redis.service';
import { ChatRoomRepository } from './repositories/chat-room.repository';

@Injectable()
export class MatchingScheduler {
  private readonly logger = new Logger(MatchingScheduler.name);
  private readonly WAIT_TIME_MS = 2 * 60 * 1000; // 2 minutes
  private isProcessing = false; // Lock to prevent concurrent runs
  private isExpiringRooms = false; // Lock to prevent concurrent expiration runs

  constructor(
    private readonly matchingService: MatchingService,
    private readonly redisService: RedisService,
    private readonly chatRoomRepository: ChatRoomRepository,
  ) {}

  /**
   * Process ready users every 10 seconds
   * Matches users who have been waiting >= 2 minutes
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async processReadyUsers() {
    // Prevent concurrent execution
    if (this.isProcessing) {
      this.logger.debug(`[SCHEDULER] ⏸️  Already processing, skipping this run`);
      return;
    }

    this.isProcessing = true;
    try {
      const queue = await this.redisService.getMatchingQueue();

      if (queue.length === 0) {
        this.logger.debug(`[SCHEDULER] Queue is empty, no users waiting`);
        return;
      }
      
      this.logger.log(`[SCHEDULER] ⏳ Queue has ${queue.length} users, checking for ready users...`);

      const now = Date.now();

      // Get users who have been waiting >= 2 minutes
      const readyUsers = queue.filter((u) => {
        const waitTime = now - u.score;
        return waitTime >= this.WAIT_TIME_MS;
      });
      
      if (readyUsers.length < 2) {
        this.logger.debug(
          `[SCHEDULER] ⏳ Only ${readyUsers.length}/${queue.length} ready users, need 2+ to match`,
        );
        
        // Show wait times for users not yet ready
        const notReady = queue.filter(u => (now - u.score) < this.WAIT_TIME_MS);
        if (notReady.length > 0) {
          const waitTimes = notReady.map(u => {
            const remaining = Math.ceil((this.WAIT_TIME_MS - (now - u.score)) / 1000);
            return `${u.userId.substring(0, 8)}: ${remaining}s`;
          }).join(', ');
          this.logger.debug(`[SCHEDULER] ⏱️  Wait times: ${waitTimes}`);
        }
        return;
      }
      
      this.logger.log(
        `[SCHEDULER] ✅ Found ${readyUsers.length}/${queue.length} ready users, processing matches...`,
      );

      // Process matches in pairs
      const processedUsers = new Set<string>();

      for (let i = 0; i < readyUsers.length; i++) {
        const user1 = readyUsers[i];

        // Skip if already matched
        if (processedUsers.has(user1.userId)) {
          continue;
        }

        // Find best match among remaining ready users
        const remainingCandidates = readyUsers.filter(
          (u) =>
            u.userId !== user1.userId &&
            !processedUsers.has(u.userId),
        );

        if (remainingCandidates.length === 0) {
          break;
        }

        const bestMatchResult =
          await this.matchingService.findBestMatchForUser(
            user1,
            remainingCandidates,
          );

        if (bestMatchResult) {
          processedUsers.add(user1.userId);
          processedUsers.add(bestMatchResult.match.userId);
          this.logger.log(
            `[SCHEDULER] 🎯 MATCHED: ${user1.userId.substring(0, 8)} ↔️ ${bestMatchResult.match.userId.substring(0, 8)} (score: ${bestMatchResult.score})`,
          );
        }
      }

      const remainingReady = readyUsers.filter(
        (u) => !processedUsers.has(u.userId),
      );
      this.logger.log(
        `[SCHEDULER] ✨ Processing complete. Matched: ${processedUsers.size / 2} pairs. Waiting: ${remainingReady.length} users`,
      );
    } catch (error) {
      this.logger.error('[SCHEDULER] ❌ Error processing ready users:', error);
    } finally {
      // Release lock
      this.isProcessing = false;
    }
  }

  /**
   * Expire chat rooms that have passed their expiration time
   * Runs every minute to check for expired rooms
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async expireChatRooms() {
    // Prevent concurrent execution
    if (this.isExpiringRooms) {
      this.logger.debug(`[EXPIRATION] ⏸️  Already processing expiration, skipping this run`);
      return;
    }

    this.isExpiringRooms = true;
    try {
      // Find all active rooms that have expired
      const expiredRooms = await this.chatRoomRepository.findExpiredActiveRooms();

      if (expiredRooms.length === 0) {
        this.logger.debug(`[EXPIRATION] No expired rooms found`);
        return;
      }

      this.logger.log(
        `[EXPIRATION] Found ${expiredRooms.length} expired room(s), expiring...`,
      );

      // Expire each room (idempotent - safe to run multiple times)
      let expiredCount = 0;
      for (const room of expiredRooms) {
        try {
          const expired = await this.matchingService.expireChatRoom(room.id);
          if (expired) {
            expiredCount++;
          }
        } catch (error) {
          this.logger.error(
            `[EXPIRATION] ❌ Error expiring room ${room.id.substring(0, 8)}:`,
            error,
          );
        }
      }

      this.logger.log(
        `[EXPIRATION] ✅ Expired ${expiredCount}/${expiredRooms.length} room(s)`,
      );
    } catch (error) {
      this.logger.error('[EXPIRATION] ❌ Error processing expired rooms:', error);
    } finally {
      // Release lock
      this.isExpiringRooms = false;
    }
  }
}