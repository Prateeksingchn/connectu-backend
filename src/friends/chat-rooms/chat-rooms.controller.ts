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
import { ChatRoomRequestService } from './chat-room-request.service';
import { FriendChatRoomService } from './friend-chat-room.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RespondChatRoomRequestDto } from './dto/respond-chat-room-request.dto';

@Controller('friends/chat-room')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class ChatRoomsController {
  constructor(
    private readonly chatRoomRequestService: ChatRoomRequestService,
    private readonly friendChatRoomService: FriendChatRoomService,
  ) {}

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

  @Patch('respond')
  async respondToChatRoomRequest(
    @CurrentUser() user: any,
    @Body() dto: RespondChatRoomRequestDto,
  ) {
    return this.chatRoomRequestService.respondToChatRoomRequest(user.id, dto);
  }

  @Get('requests')
  async getPendingChatRoomRequests(@CurrentUser() user: any) {
    return this.chatRoomRequestService.getPendingChatRoomRequests(user.id);
  }

  @Delete(':roomId')
  async endFriendChatRoom(
    @Param('roomId') roomId: string,
    @CurrentUser() user: any,
  ) {
    return this.friendChatRoomService.endFriendChatRoom(roomId, user.id);
  }

  @Get()
  async getActiveFriendChatRooms(@CurrentUser() user: any) {
    return this.friendChatRoomService.getActiveFriendChatRooms(user.id);
  }
}

