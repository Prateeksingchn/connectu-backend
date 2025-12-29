import { IsEnum, IsUUID } from 'class-validator';
import { ChatRoomRequestStatus } from '../entities/chat-room-request-status.enum';

export class RespondChatRoomRequestDto {
  @IsUUID()
  requestId: string;

  @IsEnum(ChatRoomRequestStatus)
  status: ChatRoomRequestStatus;
}

