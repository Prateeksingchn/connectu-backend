import { IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ChatRoomRequestStatus } from '../entities/chat-room-request-status.enum';

export class RespondChatRoomRequestDto {
  @ApiProperty({
    description:
      'ID of the pending chat room request to respond to. Only the addressee of the request may respond.',
    example: 'd5b3e1f0-6d3c-4a1c-9e4c-3456789012cd',
    format: 'uuid',
  })
  @IsUUID()
  requestId: string;

  @ApiProperty({
    description:
      'Whether to accept or reject the chat room request. Accepting creates a persistent FriendChatRoom between the two users.',
    enum: ChatRoomRequestStatus,
    example: ChatRoomRequestStatus.ACCEPTED,
  })
  @IsEnum(ChatRoomRequestStatus)
  status: ChatRoomRequestStatus;
}

