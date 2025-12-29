import { IsUUID, IsEnum } from 'class-validator';
import { FriendshipStatus } from '../entities/friendship-status.enum';

export class RespondFriendRequestDto {
  @IsUUID()
  friendshipId: string;

  @IsEnum(FriendshipStatus)
  status: FriendshipStatus.ACCEPTED | FriendshipStatus.REJECTED;
}

