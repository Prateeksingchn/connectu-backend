import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { HobbiesService } from './hobbies.service';
import { CreateHobbyDto } from './dto/create-hobby.dto';
import { UpdateHobbyDto } from './dto/update-hobby.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleName } from '../roles/role.enum';

@Controller('profile-config/hobbies')
export class HobbiesController {
  constructor(private readonly service: HobbiesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post()
  create(@Body() dto: CreateHobbyDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHobbyDto) {
    return this.service.update(+id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}

