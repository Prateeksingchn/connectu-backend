import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { MatchingScheduler } from './matching.scheduler';
import { AlgorithmService } from './algorithm.service';
import { ChatRoomRepository } from './repositories/chat-room.repository';
import { ChatRoom } from './entities/chat-room.entity';
import { RedisModule } from '../redis/redis.module';
import { UsersModule } from '../users/users.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([ChatRoom]),
    RedisModule,
    forwardRef(() => UsersModule),
    forwardRef(() => WebSocketModule),
  ],
  controllers: [MatchingController],
  providers: [
    MatchingService,
    MatchingScheduler,
    AlgorithmService,
    ChatRoomRepository,
  ],
  exports: [MatchingService, ChatRoomRepository],
})
export class MatchingModule {}
