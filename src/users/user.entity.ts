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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleName } from 'src/profile-config/roles/role.enum';
import { Gender } from 'src/profile-config/genders/gender.entity';
import { Interest } from 'src/profile-config/interests/interest.entity';
import { Hobby } from 'src/profile-config/hobbies/hobbies.entity';
import { TechStack } from 'src/profile-config/tech-stack/tech-stack.entity';

@Entity('users')
export class User {
  @ApiProperty({ example: 'b3f1c2b0-1234-4a5b-9c6d-abcdef012345' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'jane.doe@example.com' })
  @Column({ unique: true })
  email: string;

  // Stripped from every response by the global ClassSerializerInterceptor (main.ts).
  // Not documented as an @ApiProperty since it is never part of the response contract.
  @Exclude()
  @Column()
  password: string;

  @ApiProperty({ example: 'Jane Doe' })
  @Column()
  name: string;

  @ApiProperty({ enum: RoleName, example: RoleName.USER })
  @Column({ type: 'enum', enum: RoleName, default: RoleName.USER })
  role: RoleName;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @Column({ type: 'int', nullable: true })
  genderId: number | null;

  @ApiPropertyOptional({ type: () => Gender, nullable: true })
  @ManyToOne(() => Gender, (gender) => gender.users, {
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'genderId' })
  gender?: Gender | null;

  @ApiProperty({ type: () => Interest, isArray: true })
  @ManyToMany(() => Interest)
  @JoinTable()
  interests: Interest[];

  @ApiProperty({ type: () => Hobby, isArray: true })
  @ManyToMany(() => Hobby)
  @JoinTable()
  hobbies: Hobby[];

  @ApiProperty({ type: () => TechStack, isArray: true })
  @ManyToMany(() => TechStack)
  @JoinTable()
  techStack: TechStack[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }
}
