import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateGenderDto } from './dto/create-gender.dto';
import { GendersRepository } from './genders.repository';

@Injectable()
export class GendersService {
  constructor(private readonly gendersRepository: GendersRepository) {}

  async create(dto: CreateGenderDto) {
    const existing = await this.gendersRepository.findByName(dto.name);
    if (existing) {
      throw new ConflictException('Gender already exists');
    }
    return this.gendersRepository.create({ name: dto.name });
  }

  findAll() {
    return this.gendersRepository.findAll();
  }

  async findOne(id: number) {
    const gender = await this.gendersRepository.findById(id);
    if (!gender) {
      throw new NotFoundException('Gender not found');
    }
    return gender;
  }

  async update(id: number, dto: CreateGenderDto) {
    await this.findOne(id);
    return this.gendersRepository.update(id, dto);
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.gendersRepository.delete(id);
  }
}
