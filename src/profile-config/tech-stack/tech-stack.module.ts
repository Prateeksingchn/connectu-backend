import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TechStackController } from './tech-stack.controller';
import { TechStackService } from './tech-stack.service';
import { TechStackRepository } from './tech-stack.repository';
import { TechStack } from './tech-stack.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TechStack])],
  controllers: [TechStackController],
  providers: [TechStackService, TechStackRepository],
  exports: [TechStackService],
})
export class TechStackModule {}
