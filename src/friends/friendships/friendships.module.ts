import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendshipsController } from './friendships.controller';
import { FriendshipsService } from './friendships.service';
import { FriendshipRepository } from './repositories/friendship.repository';
import { Friendship } from './entities/friendship.entity';
import { MatchingModule } from '../../matching/matching.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Friendship]),
    forwardRef(() => MatchingModule),
  ],
  controllers: [FriendshipsController],
  providers: [FriendshipsService, FriendshipRepository],
  exports: [FriendshipsService, FriendshipRepository],
})
export class FriendshipsModule {}
