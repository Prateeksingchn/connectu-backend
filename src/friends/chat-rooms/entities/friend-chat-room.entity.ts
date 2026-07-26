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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../../users/user.entity';
import { Friendship } from '../../friendships/entities/friendship.entity';

@Entity('friend_chat_rooms')
@Index(['user1Id', 'user2Id'], { unique: true })
@Index(['friendshipId'], { unique: true })
export class FriendChatRoom {
  @ApiProperty({
    description: 'Unique identifier of the persistent friend chat room.',
    example: 'e6c4f2a1-7e4d-4b2d-af5d-4567890123de',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'ID of the underlying accepted friendship this room was created from. One friendship can have at most one friend chat room.',
    example: 'c4a2d0ef-5c2b-4f0b-8d3b-2345678901bc',
    format: 'uuid',
  })
  @Column({ type: 'uuid', unique: true })
  friendshipId: string;

  @ApiProperty({
    description: 'The friendship this chat room belongs to.',
    type: () => Friendship,
  })
  @ManyToOne(() => Friendship, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'friendshipId' })
  friendship: Friendship;

  @ApiProperty({
    description: 'ID of the first participant (the original chat room requester).',
    example: '11111111-1111-4111-8111-111111111111',
    format: 'uuid',
  })
  @Column({ type: 'uuid' })
  user1Id: string;

  @ApiProperty({
    description: 'The first participant of the chat room.',
    type: () => User,
  })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user1Id' })
  user1: User;

  @ApiProperty({
    description: 'ID of the second participant.',
    example: '22222222-2222-4222-8222-222222222222',
    format: 'uuid',
  })
  @Column({ type: 'uuid' })
  user2Id: string;

  @ApiProperty({
    description: 'The second participant of the chat room.',
    type: () => User,
  })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user2Id' })
  user2: User;

  @ApiProperty({
    description: 'Whether the chat room is currently active. Set to false once either participant ends it; unlike matched chat rooms, there is no time-based expiration.',
    example: true,
    default: true,
  })
  @Column({ default: true })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Timestamp of the most recent message sent in this room, if any.',
    example: '2026-07-24T18:30:00.000Z',
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date;

  @ApiPropertyOptional({
    description: 'Text of the most recent message sent in this room, if any.',
    example: 'See you tomorrow!',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  lastMessageText: string;

  @ApiProperty({
    description: 'Timestamp when the friend chat room was created (i.e. when the chat room request was accepted).',
    example: '2026-07-20T10:15:30.000Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the room was last updated (e.g. new message, or deactivation).',
    example: '2026-07-24T18:30:00.000Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}

