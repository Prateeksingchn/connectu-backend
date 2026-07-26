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
import { FriendshipStatus } from './friendship-status.enum';

@Entity('friendships')
@Index(['requesterId', 'addresseeId'], { unique: true })
@Index(['addresseeId', 'status'])
export class Friendship {
  @ApiProperty({
    description: 'Unique identifier of the friendship/friend-request record.',
    example: 'c4a2d0ef-5c2b-4f0b-8d3b-2345678901bc',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'ID of the user who sent the friend request.',
    example: '11111111-1111-4111-8111-111111111111',
    format: 'uuid',
  })
  @Column({ type: 'uuid' })
  requesterId: string;

  @ApiProperty({
    description: 'The user who sent the friend request.',
    type: () => User,
  })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @ApiProperty({
    description: 'ID of the user who received the friend request.',
    example: '22222222-2222-4222-8222-222222222222',
    format: 'uuid',
  })
  @Column({ type: 'uuid' })
  addresseeId: string;

  @ApiProperty({
    description: 'The user who received the friend request.',
    type: () => User,
  })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'addresseeId' })
  addressee: User;

  @ApiProperty({
    description:
      'Current state of the friend request: PENDING until the addressee responds, then ACCEPTED or REJECTED. Once REJECTED, a new request between the same pair cannot be created.',
    enum: FriendshipStatus,
    example: FriendshipStatus.PENDING,
  })
  @Column({
    type: 'enum',
    enum: FriendshipStatus,
    default: FriendshipStatus.PENDING,
  })
  status: FriendshipStatus;

  @ApiProperty({
    description: 'Timestamp when the friend request was created.',
    example: '2026-07-20T10:15:30.000Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the friendship record was last updated (e.g. status change).',
    example: '2026-07-21T09:00:00.000Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}

