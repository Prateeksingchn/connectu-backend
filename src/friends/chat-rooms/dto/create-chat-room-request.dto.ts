import { IsUUID } from 'class-validator';

export class CreateChatRoomRequestDto {
  @IsUUID()
  friendId: string;
}

