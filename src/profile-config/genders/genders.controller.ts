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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GendersService } from './genders.service';
import { CreateGenderDto } from './dto/create-gender.dto';
import { Gender } from './gender.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { RoleName } from '../roles/role.enum';
import { Roles } from 'src/common/decorators/roles.decorator';
import {
  ApiErrorResponse,
  ApiWrappedOkResponse,
  ApiWrappedResponse,
} from '../../common/decorators/api-response.decorator';

@ApiTags('genders')
@Controller('profile-config/genders')
export class GendersController {
  constructor(private readonly gendersService: GendersService) {}

  @ApiOperation({
    summary: 'List all genders',
    description:
      'Returns every gender option available for user profiles. Public endpoint, no authentication required.',
  })
  @ApiWrappedResponse(Gender, { description: 'List of genders', isArray: true })
  @Get()
  getAll() {
    return this.gendersService.findAll();
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create a new gender',
    description:
      'Admin-only. Checks that no gender with the same name already exists before inserting.',
  })
  @ApiWrappedResponse(Gender, { status: 201, description: 'Gender created' })
  @ApiErrorResponse(
    400,
    'Validation failed (e.g. name shorter than 2 characters)',
    ['name must be longer than or equal to 2 characters'],
  )
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @ApiErrorResponse(
    403,
    'Authenticated user does not have the admin role',
    'Forbidden resource',
  )
  @ApiErrorResponse(
    409,
    'A gender with this name already exists',
    'Gender already exists',
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post()
  create(@Body() dto: CreateGenderDto) {
    return this.gendersService.create(dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update a gender by id',
    description:
      'Admin-only. Verifies the gender exists first, then applies the update. Note: this endpoint reuses ' +
      'CreateGenderDto for its body, so `name` is required on every update request (there is no partial-update DTO).',
  })
  @ApiWrappedOkResponse({
    description:
      'TypeORM update result (raw update outcome, not the updated Gender entity)',
    example: { generatedMaps: [], raw: [], affected: 1 },
  })
  @ApiErrorResponse(
    400,
    'Validation failed (e.g. name shorter than 2 characters)',
    ['name must be longer than or equal to 2 characters'],
  )
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @ApiErrorResponse(
    403,
    'Authenticated user does not have the admin role',
    'Forbidden resource',
  )
  @ApiErrorResponse(404, 'No gender exists with the given id', 'Gender not found')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: CreateGenderDto) {
    // Explicitly convert route param to number
    const genderId = Number(id);
    return this.gendersService.update(genderId, dto);

  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Delete a gender by id',
    description: 'Admin-only. Verifies the gender exists before deleting it.',
  })
  @ApiWrappedOkResponse({
    description: 'TypeORM delete result',
    example: { raw: [], affected: 1 },
  })
  @ApiErrorResponse(401, 'Missing, invalid, or expired JWT', 'Unauthorized')
  @ApiErrorResponse(
    403,
    'Authenticated user does not have the admin role',
    'Forbidden resource',
  )
  @ApiErrorResponse(404, 'No gender exists with the given id', 'Gender not found')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    // Explicitly convert route param to number
    const genderId = Number(id);
    return this.gendersService.remove(genderId);
  }
}

