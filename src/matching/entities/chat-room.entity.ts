import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('chat_rooms')
export class ChatRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({ type: 'float', nullable: true })
  matchScore: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;
}

