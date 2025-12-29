import { Injectable } from '@nestjs/common';
import { InterestsRepository } from './interests.repository';
import { CreateInterestDto } from './dto/create-interest.dto';
import { UpdateInterestDto } from './dto/update-interest.dto';

@Injectable()
export class InterestsService {
  constructor(private readonly repo: InterestsRepository) {}

  create(dto: CreateInterestDto) {
    return this.repo.create(dto);
  }

  findAll() {
    return this.repo.findAll();
  }

  findOne(id: number) {
    return this.repo.findOne(id);
  }

  update(id: number, dto: UpdateInterestDto) {
    return this.repo.update(id, dto);
  }

  remove(id: number) {
    return this.repo.delete(id);
  }
}