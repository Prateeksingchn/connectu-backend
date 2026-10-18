import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';
import { RoleName } from './role.enum';

@Injectable()
export class RolesRepository {
  constructor(
    @InjectRepository(Role)
    private readonly repo: Repository<Role>,
  ) {}

  findByName(name: RoleName): Promise<Role | null> {
    return this.repo.findOne({ where: { name } });
  }

  findById(id: string): Promise<Role | null> {
    return this.repo.findOne({ where: { id } });
  }

  save(role: Role): Promise<Role> {
    return this.repo.save(role);
  }
}
