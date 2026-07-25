import { ApiProperty } from '@nestjs/swagger';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class TechStack {
  @ApiProperty({ example: 1, description: 'Tech stack id' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Node.js', description: 'Tech stack name (unique)' })
  @Column({ unique: true })
  name: string;
}
