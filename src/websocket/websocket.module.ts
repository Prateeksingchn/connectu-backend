import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebSocketGateway } from './websocket.gateway';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { ChatRoom } from '../matching/entities/chat-room.entity';
import { ChatRoomRepository } from '../matching/repositories/chat-room.repository';
import { FriendChatRoom } from '../friends/chat-rooms/entities/friend-chat-room.entity';
import { FriendChatRoomRepository } from '../friends/chat-rooms/repositories/friend-chat-room.repository';
import { AnonymousIdentityService } from './services/anonymous-identity.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ChatRoom, FriendChatRoom]),
    forwardRef(() => UsersModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [
    WebSocketGateway,
    WsJwtGuard,
    ChatRoomRepository,
    FriendChatRoomRepository,
    AnonymousIdentityService,
  ],
  exports: [WebSocketGateway, AnonymousIdentityService],
})
export class WebSocketModule {}
