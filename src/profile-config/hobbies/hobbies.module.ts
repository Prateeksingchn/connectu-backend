import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HobbiesController } from './hobbies.controller';
import { HobbiesService } from './hobbies.service';
import { HobbiesRepository } from './hobbies.repository';
import { Hobby } from './hobbies.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Hobby])],
  controllers: [HobbiesController],
  providers: [HobbiesService, HobbiesRepository],
  exports: [HobbiesService],
})
export class HobbiesModule {}
