import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { UsersController } from './users.controller';
import { User } from './user.entity';
// import { RolesModule } from '../roles/roles.module';
// import { GendersModule } from '../genders/genders.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PassportModule } from '@nestjs/passport';
import { RolesModule } from 'src/profile-config/roles/roles.module';
import { GendersModule } from 'src/profile-config/genders/genders.module';
import { FriendshipsModule } from '../friends/friendships/friendships.module';
import { RedisModule } from '../redis/redis.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    RolesModule,
    GendersModule,
    PassportModule,
    FriendshipsModule,
    RedisModule,
    forwardRef(() => WebSocketModule),
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, JwtAuthGuard, RolesGuard],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
  