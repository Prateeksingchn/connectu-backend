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
import { User } from '../../../users/user.entity';
import { Friendship } from '../../friendships/entities/friendship.entity';

@Entity('friend_chat_rooms')
@Index(['user1Id', 'user2Id'], { unique: true })
@Index(['friendshipId'], { unique: true })
export class FriendChatRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  friendshipId: string;

  @ManyToOne(() => Friendship)
  @JoinColumn({ name: 'friendshipId' })
  friendship: Friendship;

  @Column({ type: 'uuid' })
  user1Id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user1Id' })
  user1: User;

  @Column({ type: 'uuid' })
  user2Id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user2Id' })
  user2: User;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date;

  @Column({ type: 'text', nullable: true })
  lastMessageText: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

