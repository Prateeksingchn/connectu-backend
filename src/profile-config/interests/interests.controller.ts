import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InterestsService } from './interests.service';
import { CreateInterestDto } from './dto/create-interest.dto';
import { UpdateInterestDto } from './dto/update-interest.dto';
import { Interest } from './interest.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RoleName } from '../roles/role.enum';
import {
  ApiErrorResponse,
  ApiWrappedOkResponse,
  ApiWrappedResponse,
} from '../../common/decorators/api-response.decorator';

@ApiTags('interests')
@Controller('profile-config/interests')
export class InterestsController {
  constructor(private readonly service: InterestsService) {}

  @ApiOperation({
    summary: 'List all interests',
    description:
      'Returns every interest option available for user profiles and matching. Public endpoint, no authentication required.',
  })
  @ApiWrappedResponse(Interest, { description: 'List of interests', isArray: true })
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @ApiOperation({
    summary: 'Get an interest by id',
    description:
      'Looks up a single interest by its numeric id. Public endpoint. Note: the service does not throw ' +
      "NotFoundException — if no interest matches, the response is still 200 with `data: null`.",
  })
  @ApiWrappedResponse(Interest, {
    description: 'Interest found (data is null if no interest exists with that id)',
  })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create a new interest',
    description:
      'Admin-only. Inserts a new interest. There is no application-level duplicate-name check; the `name` ' +
      'column has a unique DB constraint, so inserting a duplicate name fails at the database level and ' +
      'surfaces as a generic 500 error rather than a 409.',
  })
  @ApiWrappedResponse(Interest, { status: 201, description: 'Interest created' })
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
    500,
    'Unhandled error, e.g. a duplicate name violating the unique DB constraint',
    'Internal server error',
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post()
  create(@Body() dto: CreateInterestDto) {
    return this.service.create(dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update an interest by id',
    description:
      'Admin-only. Applies a partial update. Does not verify the id exists first — updating a ' +
      'non-existent id still returns 200 with an affected count of 0 rather than a 404.',
  })
  @ApiWrappedOkResponse({
    description: 'TypeORM update result (raw update outcome, not the updated Interest entity)',
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInterestDto) {
    return this.service.update(id, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Delete an interest by id',
    description:
      'Admin-only. Does not verify the id exists first — deleting a non-existent id still returns 200 ' +
      'with an affected count of 0 rather than a 404.',
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
