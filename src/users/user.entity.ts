import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Exclude } from 'class-transformer';
import { RoleName } from 'src/profile-config/roles/role.enum';
import { Gender } from 'src/profile-config/genders/gender.entity';
import { Interest } from 'src/profile-config/interests/interest.entity';
import { Hobby } from 'src/profile-config/hobbies/hobbies.entity';
import { TechStack } from 'src/profile-config/tech-stack/tech-stack.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column()
  password: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: RoleName, default: RoleName.USER })
  role: RoleName;

  @Column({ type: 'int', nullable: true })
  genderId: number | null;

  @ManyToOne(() => Gender, (gender) => gender.users, {
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'genderId' })
  gender?: Gender | null;

  @ManyToMany(() => Interest)
  @JoinTable()
  interests: Interest[];

  @ManyToMany(() => Hobby)
  @JoinTable()
  hobbies: Hobby[];

  @ManyToMany(() => TechStack)
  @JoinTable()
  techStack: TechStack[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }
}
