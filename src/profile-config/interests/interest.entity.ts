import { ApiProperty } from '@nestjs/swagger';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Interest {
  @ApiProperty({ example: 1, description: 'Interest id' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Traveling', description: 'Interest name (unique)' })
  @Column({ unique: true })
  name: string;
}
