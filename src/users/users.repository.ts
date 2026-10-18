import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  create(user: User): Promise<User> {
    return this.repo.save(user);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({
      where: { email },
      relations: ['gender', 'interests', 'hobbies', 'techStack'],
    });
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['gender', 'interests', 'hobbies', 'techStack'],
    });
  }

  findAll(): Promise<User[]> {
    return this.repo.find({
      relations: ['gender', 'interests', 'hobbies', 'techStack'],
    });
  }

  async update(id: string, data: Partial<User>): Promise<void> {
    await this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
