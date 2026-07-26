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
import { User } from '../../users/user.entity';

@Entity('chat_rooms')
@Index(['isActive', 'expiresAt'])
export class ChatRoom {
  @ApiProperty({
    description: 'Chat room id',
    example: 'b3f1c9e0-6b1a-4b0a-9c3e-1a2b3c4d5e6f',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Id of the first matched participant',
    example: 'a1b2c3d4-e5f6-4a1b-8c9d-0e1f2a3b4c5d',
  })
  @Index()
  @Column({ type: 'uuid' })
  user1Id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user1Id' })
  user1: User;

  @ApiProperty({
    description: 'Id of the second matched participant',
    example: 'f6e5d4c3-b2a1-4d5e-9f8a-7b6c5d4e3f2a',
  })
  @Index()
  @Column({ type: 'uuid' })
  user2Id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user2Id' })
  user2: User;

  @ApiProperty({
    description:
      'Compatibility score computed by AlgorithmService: count of shared interests + hobbies + tech-stack entries between the two participants',
    example: 5,
    nullable: true,
  })
  @Column({ type: 'float', nullable: true })
  matchScore: number;

  @ApiProperty({
    description:
      'Whether the room is still open. Set false when a participant ends the chat early or when the scheduled expiration job runs after expiresAt.',
    default: true,
    example: true,
  })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({
    description: 'Timestamp the room was created (when the match was made)',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description:
      'Room TTL: set to 10 minutes after creation. Past this time the scheduled expiration job marks the room inactive.',
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;
}

