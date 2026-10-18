import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../users/user.entity';
import { ChatRoomRequestStatus } from './chat-room-request-status.enum';

@Entity('chat_room_requests')
@Index(['requesterId', 'addresseeId'], { unique: true })
export class ChatRoomRequest {
  @ApiProperty({
    description: 'Unique identifier of the chat room request.',
    example: 'd5b3e1f0-6d3c-4a1c-9e4c-3456789012cd',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description:
      'ID of the user who most recently initiated this request. If a request is reopened after being resolved, this may be reassigned to whichever friend initiates the new cycle.',
    example: '11111111-1111-4111-8111-111111111111',
    format: 'uuid',
  })
  @Column({ type: 'uuid' })
  requesterId: string;

  @ApiProperty({
    description: 'The user who initiated the chat room request.',
    type: () => User,
  })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @ApiProperty({
    description: 'ID of the friend who received the chat room request.',
    example: '22222222-2222-4222-8222-222222222222',
    format: 'uuid',
  })
  @Column({ type: 'uuid' })
  addresseeId: string;

  @ApiProperty({
    description: 'The friend who received the chat room request.',
    type: () => User,
  })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'addresseeId' })
  addressee: User;

  @ApiProperty({
    description:
      'Current state of the request: PENDING until the addressee responds, then ACCEPTED (a FriendChatRoom is created) or REJECTED. A resolved request between the same pair of friends can later be reopened (reset back to PENDING) rather than creating a new record.',
    enum: ChatRoomRequestStatus,
    example: ChatRoomRequestStatus.PENDING,
  })
  @Column({
    type: 'enum',
    enum: ChatRoomRequestStatus,
    default: ChatRoomRequestStatus.PENDING,
  })
  status: ChatRoomRequestStatus;

  @ApiProperty({
    description: 'Timestamp when the chat room request was first created.',
    example: '2026-07-20T10:15:30.000Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description:
      'Timestamp when the request was last updated (status change or reopen).',
    example: '2026-07-21T09:00:00.000Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
