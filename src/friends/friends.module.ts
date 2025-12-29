import { Module } from '@nestjs/common';
import { FriendshipsModule } from './friendships/friendships.module';
import { ChatRoomsModule } from './chat-rooms/chat-rooms.module';

@Module({
  imports: [FriendshipsModule, ChatRoomsModule],
  exports: [FriendshipsModule, ChatRoomsModule],
})
export class FriendsModule {}
