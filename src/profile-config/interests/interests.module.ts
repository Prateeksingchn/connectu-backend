import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterestsController } from './interests.controller';
import { InterestsService } from './interests.service';
import { InterestsRepository } from './interests.repository';
import { Interest } from './interest.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Interest])],
  controllers: [InterestsController],
  providers: [InterestsService, InterestsRepository],
  exports: [InterestsService],
})
export class InterestsModule {}
