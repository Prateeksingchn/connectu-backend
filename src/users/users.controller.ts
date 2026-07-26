import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from 'src/profile-config/roles/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from './user.entity';
import { MessageResponseDto } from '../common/dto/message-response.dto';
import { ApiErrorResponse, ApiWrappedResponse } from '../common/decorators/api-response.decorator';

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: 'List all users (admin only)',
    description: 'Returns every user with their gender/interests/hobbies/tech-stack relations loaded.',
  })
  @ApiWrappedResponse(User, { isArray: true, description: 'All users' })
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @ApiErrorResponse(403, 'Authenticated user is not an ADMIN', 'Forbidden resource')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @ApiOperation({
    summary: "Get a user's profile with friendship-gated access control",
    description:
      'A user can always view their own profile. Viewing another user\'s profile is only allowed once the two ' +
      'users have an ACCEPTED friendship — otherwise the request is rejected even though both users are authenticated.',
  })
  @ApiWrappedResponse(User, { description: 'Target user profile' })
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @ApiErrorResponse(
    403,
    'Requester and target are not accepted friends',
    'Profile access is only available to accepted friends',
  )
  @ApiErrorResponse(404, 'Target user does not exist', 'User not found')
  @Get('profile/:id')
  async getProfile(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.findProfile(user.id, id);
  }

  @ApiOperation({
    summary: 'Get a single user by id (admin only)',
    description: 'Fetches any user by id, including their gender/interests/hobbies/tech-stack relations.',
  })
  @ApiWrappedResponse(User, { description: 'User found' })
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @ApiErrorResponse(403, 'Authenticated user is not an ADMIN', 'Forbidden resource')
  @ApiErrorResponse(404, 'No user with the given id', 'User not found')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @ApiOperation({
    summary: 'Delete a user (admin only)',
    description: 'Permanently removes the user record after confirming it exists.',
  })
  @ApiWrappedResponse(MessageResponseDto, { description: 'User removed successfully' })
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @ApiErrorResponse(403, 'Authenticated user is not an ADMIN', 'Forbidden resource')
  @ApiErrorResponse(404, 'No user with the given id', 'User not found')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
