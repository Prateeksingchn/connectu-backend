import { User } from 'src/users/user.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('genders')
export class Gender {
  @ApiProperty({ example: 1, description: 'Gender id' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Non-binary', description: 'Gender name (unique)' })
  @Column({ unique: true })
  name: string;

  // Inverse relation, not eagerly loaded and never populated on responses
  // returned by this module's endpoints — intentionally left undocumented.
  @OneToMany(() => User, (user) => user.gender)
  users: User[];
}
