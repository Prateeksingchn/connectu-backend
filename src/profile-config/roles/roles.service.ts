import { Injectable, NotFoundException } from '@nestjs/common';
import { RolesRepository } from './roles.repository';
import { Role } from './role.entity';
import { RoleName } from './role.enum';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async findByName(name: RoleName): Promise<Role> {
    const role = await this.rolesRepository.findByName(name);
    if (!role) {
      throw new NotFoundException(`Role ${name} not found`);
    }
    return role;
  }
}
