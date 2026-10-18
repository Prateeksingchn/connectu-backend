import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FriendshipsService } from './friendships.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { RespondFriendRequestDto } from './dto/respond-friend-request.dto';
import {
  ApiErrorResponse,
  ApiWrappedOkResponse,
} from '../../common/decorators/api-response.decorator';

@ApiTags('friendships')
@ApiBearerAuth('access-token')
@Controller('friends')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class FriendshipsController {
  constructor(private readonly friendshipsService: FriendshipsService) {}

  @ApiOperation({
    summary: 'Send a friend request',
    description:
      'Sends a friend request to another user. Requires that the two users previously participated together in a matched chat room (any status) and do not currently share an active chat room. ' +
      'Fails if a friendship record already exists between the two users, regardless of its current status (PENDING, ACCEPTED, or REJECTED) — a REJECTED request can never be recreated.',
  })
  @ApiWrappedOkResponse({
    status: 201,
    description: 'Friend request created as PENDING',
    example: {
      message: 'Friend request sent successfully',
      friendshipId: 'c4a2d0ef-5c2b-4f0b-8d3b-2345678901bc',
    },
  })
  @ApiErrorResponse(
    400,
    'Attempted to send a friend request to yourself',
    'Cannot send friend request to yourself',
  )
  @ApiErrorResponse(
    403,
    'The chat room between these users is still active, or they have never chatted together',
    'Can only send friend requests to users you have chatted with',
  )
  @ApiErrorResponse(
    409,
    'A friendship record already exists between these users (pending, accepted, or rejected)',
    'Users are already friends',
  )
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @Post('request')
  async sendFriendRequest(
    @CurrentUser() user: any,
    @Body() dto: SendFriendRequestDto,
  ) {
    return this.friendshipsService.sendFriendRequest(user.id, dto);
  }

  @ApiOperation({
    summary: 'Send a friend request to the other person in an anonymous chat',
    description:
      'Used from an anonymous matching chat, where the client deliberately never learns the other user real id. ' +
      'The caller must be a participant of the room, and the room must have ended or expired. ' +
      'The other participant is resolved server-side and is never returned. Otherwise behaves exactly like POST /friends/request ' +
      '(same duplicate, self and race protection).',
  })
  @ApiWrappedOkResponse({
    status: 201,
    description: 'Friend request created as PENDING',
    example: {
      message: 'Friend request sent successfully',
      friendshipId: 'c4a2d0ef-5c2b-4f0b-8d3b-2345678901bc',
    },
  })
  @ApiErrorResponse(
    403,
    'The chat room is still active',
    'Cannot send friend request while chat room is active',
  )
  @ApiErrorResponse(
    404,
    'No such room, or the caller is not a participant of it',
    'Chat room not found',
  )
  @ApiErrorResponse(
    409,
    'A friendship record already exists between these users (pending, accepted, or rejected)',
    'Friend request already pending',
  )
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @Post('request/by-room/:roomId')
  async sendFriendRequestByRoom(
    @CurrentUser() user: any,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    return this.friendshipsService.sendFriendRequestByRoom(user.id, roomId);
  }

  @ApiOperation({
    summary: 'Accept or reject a pending friend request',
    description:
      'Updates the status of a friend request. Only the addressee (recipient) of the request may respond, and the request must currently be PENDING. ' +
      'Accepting makes the two users friends; rejecting permanently closes that request (it cannot be resent).',
  })
  @ApiWrappedOkResponse({
    description: 'Friend request status updated',
    example: { message: 'Friend request accepted successfully' },
  })
  @ApiErrorResponse(
    400,
    'Friendship record not found, or it is not currently PENDING',
    'Friend request not found',
  )
  @ApiErrorResponse(
    403,
    'The current user is not the addressee of this friend request',
    'Only the recipient can respond to friend requests',
  )
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @Patch('respond')
  async respondToFriendRequest(
    @CurrentUser() user: any,
    @Body() dto: RespondFriendRequestDto,
  ) {
    return this.friendshipsService.respondToFriendRequest(user.id, dto);
  }

  @ApiOperation({
    summary: 'List my accepted friends',
    description:
      'Returns every user the current user has an ACCEPTED friendship with, along with the friendship ID and when it was created.',
  })
  @ApiWrappedOkResponse({
    description: 'List of accepted friends',
    example: [
      {
        friendshipId: 'c4a2d0ef-5c2b-4f0b-8d3b-2345678901bc',
        friend: {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Jane Doe',
          email: 'jane@example.com',
        },
        createdAt: '2026-07-20T10:15:30.000Z',
      },
    ],
  })
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @Get()
  async getFriends(@CurrentUser() user: any) {
    return this.friendshipsService.getFriends(user.id);
  }

  @ApiOperation({
    summary: 'List my pending incoming friend requests',
    description:
      "Returns every PENDING friend request addressed to the current user (i.e. requests awaiting this user's response), with requester details.",
  })
  @ApiWrappedOkResponse({
    description: 'List of pending incoming friend requests',
    example: [
      {
        friendshipId: 'c4a2d0ef-5c2b-4f0b-8d3b-2345678901bc',
        requester: {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'John Smith',
          email: 'john@example.com',
        },
        createdAt: '2026-07-20T10:15:30.000Z',
      },
    ],
  })
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @Get('requests')
  async getPendingRequests(@CurrentUser() user: any) {
    return this.friendshipsService.getPendingRequests(user.id);
  }
}
