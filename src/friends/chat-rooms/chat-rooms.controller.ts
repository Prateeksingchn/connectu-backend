import {
  Controller,
  Post,
  Patch,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ChatRoomRequestService } from './chat-room-request.service';
import { FriendChatRoomService } from './friend-chat-room.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RespondChatRoomRequestDto } from './dto/respond-chat-room-request.dto';
import {
  ApiErrorResponse,
  ApiWrappedOkResponse,
} from '../../common/decorators/api-response.decorator';

@ApiTags('chat-rooms')
@ApiBearerAuth('access-token')
@Controller('friends/chat-room')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class ChatRoomsController {
  constructor(
    private readonly chatRoomRequestService: ChatRoomRequestService,
    private readonly friendChatRoomService: FriendChatRoomService,
  ) {}

  @ApiOperation({
    summary: 'Request a persistent chat room with a friend',
    description:
      'Creates (or, if a prior request between the same two friends was already resolved, reopens/resets it back to PENDING) a chat room request. ' +
      'Requires that the current user and friendId are ACCEPTED friends, and that no friend chat room is currently active between them. ' +
      'The recipient is notified over WebSocket (chatRoomRequestReceived). Note: friendId is a route parameter, not a request body.',
  })
  @ApiParam({ name: 'friendId', description: 'User ID of the accepted friend to request a chat room with', example: '22222222-2222-4222-8222-222222222222' })
  @ApiWrappedOkResponse({
    status: 201,
    description: 'Chat room request created or reopened as PENDING',
    example: { message: 'Chat room request sent successfully', requestId: 'd5b3e1f0-6d3c-4a1c-9e4c-3456789012cd' },
  })
  @ApiErrorResponse(403, 'The current user and friendId are not accepted friends', 'You can only create chat room requests with accepted friends')
  @ApiErrorResponse(409, 'A friend chat room is already active between these two friends', 'Cannot create chat room request while friend chat room is active')
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @Post(':friendId')
  async createChatRoomRequest(
    @CurrentUser() user: any,
    @Param('friendId') friendId: string,
  ) {
    return this.chatRoomRequestService.createChatRoomRequest(
      user.id,
      friendId,
    );
  }

  @ApiOperation({
    summary: 'Accept or reject a pending chat room request',
    description:
      'Updates the status of a chat room request. Only the addressee may respond. ' +
      'Accepting creates a persistent FriendChatRoom (no expiration) linked to the underlying friendship and notifies both users over WebSocket (chatRoomCreated). ' +
      'Rejecting notifies the requester (chatRoomRequestRejected).',
  })
  @ApiWrappedOkResponse({
    description: 'Chat room request updated. `roomId` is present only when accepted.',
    example: { message: 'Chat room request accepted and room created successfully', roomId: 'e6c4f2a1-7e4d-4b2d-af5d-4567890123de' },
  })
  @ApiErrorResponse(404, 'Chat room request not found', 'Chat room request not found')
  @ApiErrorResponse(403, 'The current user is not the addressee of this chat room request', 'Only the recipient can respond to chat room requests')
  @ApiErrorResponse(400, 'Status update failed, or (on accept) the underlying friendship could not be found', 'Failed to update chat room request')
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @Patch('respond')
  async respondToChatRoomRequest(
    @CurrentUser() user: any,
    @Body() dto: RespondChatRoomRequestDto,
  ) {
    return this.chatRoomRequestService.respondToChatRoomRequest(user.id, dto);
  }

  @ApiOperation({
    summary: 'List my pending incoming chat room requests',
    description: 'Returns every PENDING chat room request addressed to the current user, with requester details.',
  })
  @ApiWrappedOkResponse({
    description: 'List of pending incoming chat room requests',
    example: [
      {
        requestId: 'd5b3e1f0-6d3c-4a1c-9e4c-3456789012cd',
        requester: { id: '11111111-1111-4111-8111-111111111111', name: 'John Smith', email: 'john@example.com' },
        createdAt: '2026-07-20T10:15:30.000Z',
      },
    ],
  })
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @Get('requests')
  async getPendingChatRoomRequests(@CurrentUser() user: any) {
    return this.chatRoomRequestService.getPendingChatRoomRequests(user.id);
  }

  @ApiOperation({
    summary: 'End a persistent friend chat room',
    description: 'Marks a friend chat room as inactive. Only a participant (user1 or user2) of the room may end it.',
  })
  @ApiParam({ name: 'roomId', description: 'ID of the friend chat room to end', example: 'e6c4f2a1-7e4d-4b2d-af5d-4567890123de' })
  @ApiWrappedOkResponse({
    description: 'Friend chat room deactivated',
    example: { message: 'Friend chat room ended successfully' },
  })
  @ApiErrorResponse(400, 'No friend chat room exists with the given ID', 'Friend chat room not found')
  @ApiErrorResponse(403, 'The current user is not a participant in this chat room', 'You are not authorized to end this chat room')
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @Delete(':roomId')
  async endFriendChatRoom(
    @Param('roomId') roomId: string,
    @CurrentUser() user: any,
  ) {
    return this.friendChatRoomService.endFriendChatRoom(roomId, user.id);
  }

  @ApiOperation({
    summary: 'List my active persistent friend chat rooms',
    description: 'Returns every currently-active friend chat room the current user participates in, including the friend\'s basic info and the last message preview, ordered by most recent activity.',
  })
  @ApiWrappedOkResponse({
    description: 'List of active friend chat rooms',
    example: [
      {
        roomId: 'e6c4f2a1-7e4d-4b2d-af5d-4567890123de',
        friend: { id: '22222222-2222-4222-8222-222222222222', name: 'Jane Doe', email: 'jane@example.com' },
        lastMessageAt: '2026-07-24T18:30:00.000Z',
        lastMessageText: 'See you tomorrow!',
        createdAt: '2026-07-20T10:15:30.000Z',
      },
    ],
  })
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @Get()
  async getActiveFriendChatRooms(@CurrentUser() user: any) {
    return this.friendChatRoomService.getActiveFriendChatRooms(user.id);
  }
}

