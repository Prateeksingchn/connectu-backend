import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interest } from './interest.entity';

@Injectable()
export class InterestsRepository {
  constructor(
    @InjectRepository(Interest)
    private readonly repo: Repository<Interest>,
  ) {}

  create(data: Partial<Interest>) {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  findAll() {
    return this.repo.find();
  }

  findOne(id: number) {
    return this.repo.findOneBy({ id });
  }

  update(id: number, data: Partial<Interest>) {
    return this.repo.update(id, data);
  }

  delete(id: number) {
    return this.repo.delete(id);
  }
}
