import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { GendersService } from './genders.service';
import { CreateGenderDto } from './dto/create-gender.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { RoleName } from '../roles/role.enum';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('profile-config/genders')
export class GendersController {
  constructor(private readonly gendersService: GendersService) {}

  @Get()
  getAll() {
    return this.gendersService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post()
  create(@Body() dto: CreateGenderDto) {
    return this.gendersService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: CreateGenderDto) {
    // Explicitly convert route param to number
    const genderId = Number(id);
    return this.gendersService.update(genderId, dto);
    
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    // Explicitly convert route param to number
    const genderId = Number(id);
    return this.gendersService.remove(genderId);
  }
}

