import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChatRoomRequestDto {
  @ApiProperty({
    description:
      'ID of the accepted friend to request a persistent chat room with. The two users must already be ACCEPTED friends.',
    example: '22222222-2222-4222-8222-222222222222',
    format: 'uuid',
  })
  @IsUUID()
  friendId: string;
}
