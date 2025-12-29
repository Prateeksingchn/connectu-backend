import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfileConfigModule } from './profile-config/profile-config.module';
import { User } from './users/user.entity';
import { Role } from './profile-config/roles/role.entity';
import { Gender } from './profile-config/genders/gender.entity';
import { Interest } from './profile-config/interests/interest.entity';
import { Hobby } from './profile-config/hobbies/hobbies.entity';
import { TechStack } from './profile-config/tech-stack/tech-stack.entity';
import { WebSocketModule } from './websocket/websocket.module';
import { RedisModule } from './redis/redis.module';
import { MatchingModule } from './matching/matching.module';
import { ChatRoom } from './matching/entities/chat-room.entity';
import { FriendsModule } from './friends/friends.module';
import { Friendship } from './friends/friendships/entities/friendship.entity';
import { ChatRoomRequest } from './friends/chat-rooms/entities/chat-room-request.entity';
import { FriendChatRoom } from './friends/chat-rooms/entities/friend-chat-room.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [User, Role, Gender, Interest, Hobby, TechStack, ChatRoom, Friendship, ChatRoomRequest, FriendChatRoom],
      synchronize: true,
      logging: true,
    }),
    ScheduleModule.forRoot(),
    RedisModule,
    UsersModule,
    AuthModule,
    ProfileConfigModule,
    WebSocketModule,
    MatchingModule,
    FriendsModule,
  ],
})
export class AppModule {}