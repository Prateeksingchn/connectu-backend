import { ApiProperty } from '@nestjs/swagger';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Hobby {
  @ApiProperty({ example: 1, description: 'Hobby id' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Photography', description: 'Hobby name (unique)' })
  @Column({ unique: true })
  name: string;
}
