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
import { TechStackService } from './tech-stack.service';
import { CreateTechStackDto } from './dto/create-tech-stack.dto';
import { UpdateTechStackDto } from './dto/update-tech-stack.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleName } from '../roles/role.enum';

@Controller('profile-config/tech-stack')
export class TechStackController {
  constructor(private readonly service: TechStackService) {}

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
  create(@Body() dto: CreateTechStackDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTechStackDto) {
    return this.service.update(+id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
