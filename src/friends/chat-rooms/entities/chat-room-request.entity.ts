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
import { ChatRoomRequestStatus } from './chat-room-request-status.enum';

@Entity('chat_room_requests')
@Index(['requesterId', 'addresseeId'], { unique: true })
export class ChatRoomRequest {
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
    enum: ChatRoomRequestStatus,
    default: ChatRoomRequestStatus.PENDING,
  })
  status: ChatRoomRequestStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

