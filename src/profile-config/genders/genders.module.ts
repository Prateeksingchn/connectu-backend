import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gender } from './gender.entity';
import { GendersRepository } from './genders.repository';
import { GendersService } from './genders.service';
import { GendersController } from './genders.controller';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [TypeOrmModule.forFeature([Gender]), PassportModule],
  controllers: [GendersController],
  providers: [GendersRepository, GendersService, JwtAuthGuard, RolesGuard],
  exports: [GendersService],
})
export class GendersModule {}
