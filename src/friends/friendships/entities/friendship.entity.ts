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
import { FriendshipStatus } from './friendship-status.enum';

@Entity('friendships')
@Index(['requesterId', 'addresseeId'], { unique: true })
export class Friendship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  requesterId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @Column({ type: 'uuid' })
  addresseeId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'addresseeId' })
  addressee: User;

  @Column({
    type: 'enum',
    enum: FriendshipStatus,
    default: FriendshipStatus.PENDING,
  })
  status: FriendshipStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

