import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TechStack } from './tech-stack.entity';

@Injectable()
export class TechStackRepository {
  constructor(
    @InjectRepository(TechStack)
    private readonly repo: Repository<TechStack>,
  ) {}

  create(data: Partial<TechStack>) {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  findAll() {
    return this.repo.find();
  }

  findOne(id: number) {
    return this.repo.findOneBy({ id });
  }

  update(id: number, data: Partial<TechStack>) {
    return this.repo.update(id, data);
  }

  delete(id: number) {
    return this.repo.delete(id);
  }
}
