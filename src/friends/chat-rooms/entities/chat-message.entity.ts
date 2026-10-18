import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../users/user.entity';
import { FriendChatRoom } from './friend-chat-room.entity';

@Entity('chat_messages')
@Index(['roomId', 'createdAt'])
export class ChatMessage {
  @ApiProperty({
    description: 'Unique identifier of the chat message.',
    example: 'f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description:
      'ID of the friend chat room this message belongs to. Friend chat rooms only - anonymous matching chat rooms never persist messages.',
    example: 'e6c4f2a1-7e4d-4b2d-af5d-4567890123de',
    format: 'uuid',
  })
  @Column({ type: 'uuid' })
  roomId: string;

  @ApiProperty({
    description: 'The friend chat room this message belongs to.',
    type: () => FriendChatRoom,
  })
  @ManyToOne(() => FriendChatRoom, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: FriendChatRoom;

  @ApiProperty({
    description: 'ID of the user who sent this message.',
    example: '11111111-1111-4111-8111-111111111111',
    format: 'uuid',
  })
  @Column({ type: 'uuid' })
  senderId: string;

  @ApiProperty({
    description: 'The user who sent this message.',
    type: () => User,
  })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @ApiProperty({
    description: 'Message text content.',
    example: 'See you tomorrow!',
  })
  @Column({ type: 'text' })
  content: string;

  @ApiProperty({
    description: 'Timestamp when the message was sent.',
    example: '2026-07-24T18:30:00.000Z',
  })
  @CreateDateColumn()
  createdAt: Date;
}
