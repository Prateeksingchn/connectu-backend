import { IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FriendshipStatus } from '../entities/friendship-status.enum';

export class RespondFriendRequestDto {
  @ApiProperty({
    description:
      'ID of the pending friendship record to respond to. Only the addressee of the request may respond, and the request must currently be PENDING.',
    example: 'c4a2d0ef-5c2b-4f0b-8d3b-2345678901bc',
    format: 'uuid',
  })
  @IsUUID()
  friendshipId: string;

  @ApiProperty({
    description: 'Whether to accept or reject the friend request.',
    enum: [FriendshipStatus.ACCEPTED, FriendshipStatus.REJECTED],
    example: FriendshipStatus.ACCEPTED,
  })
  @IsEnum(FriendshipStatus)
  status: FriendshipStatus.ACCEPTED | FriendshipStatus.REJECTED;
}

