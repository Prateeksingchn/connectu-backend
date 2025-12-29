import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class TechStack {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;
}
