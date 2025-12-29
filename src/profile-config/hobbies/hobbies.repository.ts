import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hobby } from './hobbies.entity';

@Injectable()
export class HobbiesRepository {
  constructor(
    @InjectRepository(Hobby)
    private readonly repo: Repository<Hobby>,
  ) {}

  create(data: Partial<Hobby>) {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  findAll() {
    return this.repo.find();
  }

  findOne(id: number) {
    return this.repo.findOneBy({ id });
  }

  update(id: number, data: Partial<Hobby>) {
    return this.repo.update(id, data);
  }

  delete(id: number) {
    return this.repo.delete(id);
  }
}
