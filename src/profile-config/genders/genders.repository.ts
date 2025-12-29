import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { Gender } from './gender.entity';

@Injectable()
export class GendersRepository {
  constructor(
    @InjectRepository(Gender)
    private readonly repo: Repository<Gender>,
  ) {}
  
  // create(gender: Gender): Promise<Gender> {
  //   return this.repo.save(gender);
  // }

  create(data: Partial<Gender>): Promise<Gender> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }
  

  findAll(): Promise<Gender[]> {
    return this.repo.find();
  }

  findById(id: number): Promise<Gender | null> {
    return this.repo.findOne({ where: { id: Number(id) } });
  }

  findByName(name: string): Promise<Gender | null> {
    return this.repo.findOne({ where: { name } });
  }

  update(id: number, data: Partial<Gender>): Promise<UpdateResult> {
    return this.repo.update(Number(id), data);
  }

  delete(id: number): Promise<DeleteResult> {
    return this.repo.delete(Number(id));
  }
}

