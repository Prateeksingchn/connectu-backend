import {
  Controller,
  Post,
  Get,
  Delete,
  UseGuards,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MatchingService } from './matching.service';
import {
  ApiErrorResponse,
  ApiWrappedOkResponse,
} from '../common/decorators/api-response.decorator';

/**
 * Throttle key for /matching/stats. The global ThrottlerGuard runs before
 * JwtAuthGuard, so req.user isn't populated yet; keying on the bearer token
 * limits per session (one user's polling can't eat a shared-NAT neighbour's
 * budget) and falls back to the IP when there is no token.
 */
export function statsThrottleTracker(req: Record<string, any>): string {
  const auth = req.headers?.authorization;
  return typeof auth === 'string' && auth
    ? `token:${createHash('sha256').update(auth).digest('hex')}`
    : `ip:${req.ip}`;
}

@ApiTags('matching')
@ApiBearerAuth('access-token')
@Controller('matching')
@UseGuards(JwtAuthGuard)
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @ApiOperation({
    summary: 'Join the matchmaking queue',
    description:
      'Adds the authenticated user to the Redis-backed matching queue along with their interests, ' +
      'hobbies, and tech stack. This endpoint only enqueues the user — it does not perform matching ' +
      'itself. A background scheduler runs every 10 seconds and, once a user has been queued for at ' +
      'least 2 minutes, pairs them with the best-scoring compatible candidate (most shared interests/' +
      'hobbies/tech-stack among other ready users), or matches immediately if only one other candidate ' +
      'is ready. A successful match creates a ChatRoom (10-minute TTL) and notifies both users over ' +
      'WebSocket with a MATCH_FOUND event.',
  })
  @ApiWrappedOkResponse({
    status: 201,
    description:
      'Added to the matching queue. Matching happens asynchronously via the scheduler and a WebSocket ' +
      'MATCH_FOUND event, not in this response.',
    example: {
      message:
        'Added to matching queue. Finding best match... (may take up to 2 minutes)',
      queueSize: 3,
      estimatedWaitTime: '2 minutes',
    },
  })
  @ApiErrorResponse(
    400,
    'Authenticated user could not be found while building the matching profile',
    'User not found',
  )
  @ApiErrorResponse(
    409,
    'User is already waiting in the matching queue',
    'You are already in the matching queue',
  )
  @ApiErrorResponse(
    409,
    'User is already in an active (non-expired) chat room and must end/finish it before requeueing',
    'You are already in an active chat room',
  )
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('join-queue')
  async joinQueue(@CurrentUser() user: any) {
    return this.matchingService.joinQueue(user.id);
  }

  @ApiOperation({
    summary: 'Leave the matchmaking queue',
    description:
      'Removes the authenticated user from the Redis matching queue while they are still waiting, ' +
      'e.g. if they cancel the search before the scheduler has paired them with anyone.',
  })
  @ApiWrappedOkResponse({
    description: 'User removed from the matching queue',
    example: { message: 'Left matching queue successfully' },
  })
  @ApiErrorResponse(
    400,
    'User is not currently present in the matching queue',
    'You are not in the matching queue',
  )
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @Delete('leave-queue')
  async leaveQueue(@CurrentUser() user: any) {
    return this.matchingService.leaveQueue(user.id);
  }

  @ApiOperation({
    summary: 'Clear the entire matching queue (admin only)',
    description:
      'Administrative/testing utility that empties the Redis matching queue of every waiting user, ' +
      'regardless of how long they have been queued. Does not affect chat rooms already created. ' +
      'Requires the ADMIN role.',
  })
  @ApiWrappedOkResponse({
    description: 'Matching queue cleared',
    example: {
      message: 'Cleared 4 users from queue',
      usersCleared: 4,
    },
  })
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @ApiErrorResponse(
    403,
    'Authenticated user does not have the ADMIN role',
    'Forbidden resource',
  )
  @Delete('clear-queue')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async clearQueue() {
    return this.matchingService.clearAllUsersFromQueue();
  }

  @ApiOperation({
    summary: 'End an active chat room early',
    description:
      'Lets one of the two matched participants close their chat room before the 10-minute TTL ' +
      'expires. Marks the room inactive in the database and clears its Redis tracking keys ' +
      '(active-room cache and per-user room mapping) for both participants; the caller must be one ' +
      'of the two users assigned to the room.',
  })
  @ApiParam({ name: 'id', description: 'ChatRoom id (UUID)', format: 'uuid' })
  @ApiWrappedOkResponse({
    description: 'Chat room ended',
    example: { message: 'Chat room ended successfully' },
  })
  @ApiErrorResponse(
    400,
    'No chat room exists with the given id',
    'Chat room not found',
  )
  @ApiErrorResponse(
    400,
    'Authenticated user is not one of the two participants in this chat room',
    'You are not authorized to end this chat room',
  )
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @Delete('end-chat-room/:id')
  async endChatRoom(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.matchingService.endActiveChatRoom(id, user.id);
  }

  @ApiOperation({
    summary: "Get the caller's currently active anonymous chat room, if any",
    description:
      'Lets a tab that does not know which room it is in (a fresh tab, or a hard refresh that wiped ' +
      'in-memory frontend state) recover it from the backend instead of hitting a dead end. Uses the ' +
      'same expiry-aware lookup as join-queue, so a room past its expiresAt is treated as gone (and ' +
      'self-heals its isActive flag) rather than returned as active. Returns null when there is no ' +
      'active room.',
  })
  @ApiWrappedOkResponse({
    description: 'The active room, or null if the caller has none',
    example: {
      roomId: 'b3f1c9e0-6b1a-4b0a-9c3e-1a2b3c4d5e6f',
      otherUserId: 'f6e5d4c3-b2a1-4d5e-9f8a-7b6c5d4e3f2a',
      matchScore: 5,
      expiresAt: '2026-07-26T18:40:00.000Z',
    },
  })
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @Get('active-room')
  async getActiveRoom(@CurrentUser() user: any) {
    return this.matchingService.getActiveRoom(user.id);
  }

  @ApiOperation({
    summary: 'Aggregate queue/presence counters',
    description:
      'Powers the ambient "N people online now" indicator on the Discover screen. Returns counts ' +
      'only - never user ids, names, or anything else that could identify who is queued or ' +
      "connected. usersOnline is read from the WebSocket gateway's in-memory connection map, so it " +
      'reflects the current process and resets on restart; usersInQueue is the size of the Redis ' +
      'matching queue. Intended to be polled at a low frequency (the frontend polls every 30s).',
  })
  @ApiWrappedOkResponse({
    description: 'Current aggregate counts',
    example: { usersInQueue: 3, usersOnline: 12 },
  })
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @ApiErrorResponse(
    429,
    'More than 30 requests in a minute from the same session',
    'ThrottlerException: Too Many Requests',
  )
  @Throttle({
    default: { limit: 30, ttl: 60_000, getTracker: statsThrottleTracker },
  })
  @Get('stats')
  async getStats() {
    return this.matchingService.getStats();
  }
}
