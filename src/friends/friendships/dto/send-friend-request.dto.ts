import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendFriendRequestDto {
  @ApiProperty({
    description:
      'User ID of the person to send a friend request to. The two users must have participated together in a (now inactive) matched chat room, must not currently share an active chat room, and must not already have a friendship record between them.',
    example: 'b3f1c9de-4b1a-4e9a-9c2a-1234567890ab',
    format: 'uuid',
  })
  @IsUUID()
  addresseeId: string;
}
