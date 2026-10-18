import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoomsController } from './chat-rooms.controller';
import { ChatRoomRequestService } from './chat-room-request.service';
import { FriendChatRoomService } from './friend-chat-room.service';
import { ChatMessageService } from './chat-message.service';
import { ChatRoomRequestRepository } from './repositories/chat-room-request.repository';
import { FriendChatRoomRepository } from './repositories/friend-chat-room.repository';
import { ChatMessageRepository } from './repositories/chat-message.repository';
import { ChatRoomRequest } from './entities/chat-room-request.entity';
import { FriendChatRoom } from './entities/friend-chat-room.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { FriendshipsModule } from '../friendships/friendships.module';
import { WebSocketModule } from '../../websocket/websocket.module';
import { MatchingModule } from '../../matching/matching.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatRoomRequest, FriendChatRoom, ChatMessage]),
    forwardRef(() => FriendshipsModule),
    forwardRef(() => WebSocketModule),
    forwardRef(() => MatchingModule),
  ],
  controllers: [ChatRoomsController],
  providers: [
    ChatRoomRequestService,
    FriendChatRoomService,
    ChatMessageService,
    ChatRoomRequestRepository,
    FriendChatRoomRepository,
    ChatMessageRepository,
  ],
  exports: [
    ChatRoomRequestService,
    FriendChatRoomService,
    ChatMessageService,
    FriendChatRoomRepository,
  ],
})
export class ChatRoomsModule {}
