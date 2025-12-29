import { Injectable } from '@nestjs/common';
import { HobbiesRepository } from './hobbies.repository';
import { CreateHobbyDto } from './dto/create-hobby.dto';
import { UpdateHobbyDto } from './dto/update-hobby.dto';

@Injectable()
export class HobbiesService {
  constructor(private readonly repo: HobbiesRepository) {}

  create(dto: CreateHobbyDto) {
    return this.repo.create(dto);
  }

  findAll() {
    return this.repo.findAll();
  }

  findOne(id: number) {
    return this.repo.findOne(id);
  }

  update(id: number, dto: UpdateHobbyDto) {
    return this.repo.update(id, dto);
  }

  remove(id: number) {
    return this.repo.delete(id);
  }
}
