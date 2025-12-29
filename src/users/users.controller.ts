import {
  Controller,
  Delete,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from 'src/profile-config/roles/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }
  
  /**
   * Get user profile with chat visibility enforcement
   * Regular users can access profiles, but blocked if active chat exists
   */
  @Get('profile/:id')
  async getProfile(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.usersService.findProfile(user.id, id);
  }

  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}