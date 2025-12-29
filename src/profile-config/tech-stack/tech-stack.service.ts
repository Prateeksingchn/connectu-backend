import { Injectable } from '@nestjs/common';
import { TechStackRepository } from './tech-stack.repository';
import { CreateTechStackDto } from './dto/create-tech-stack.dto';
import { UpdateTechStackDto } from './dto/update-tech-stack.dto';

@Injectable()
export class TechStackService {
  constructor(private readonly repo: TechStackRepository) {}

  create(dto: CreateTechStackDto) {
    return this.repo.create(dto);
  }

  findAll() {
    return this.repo.findAll();
  }

  findOne(id: number) {
    return this.repo.findOne(id);
  }

  update(id: number, dto: UpdateTechStackDto) {
    return this.repo.update(id, dto);
  }

  remove(id: number) {
    return this.repo.delete(id);
  }
}
