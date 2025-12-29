import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { RoleName } from './role.enum';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, type: 'enum', enum: RoleName })
  name: RoleName;
}
