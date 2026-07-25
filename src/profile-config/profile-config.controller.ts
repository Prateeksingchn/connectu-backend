import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('profile-config')
@Controller('profile-config')
export class ProfileConfigController {}
