import { ApiProperty } from '@nestjs/swagger';
import { RoleName } from '../../profile-config/roles/role.enum';

export class AuthUserDto {
  @ApiProperty({ example: 'b3f1c2b0-1234-4a5b-9c6d-abcdef012345' })
  id: string;

  @ApiProperty({ example: 'jane.doe@example.com' })
  email: string;

  @ApiProperty({ example: 'Jane Doe' })
  name: string;

  @ApiProperty({ enum: RoleName, example: RoleName.USER })
  role: RoleName;
}

export class RegisterResponseDto {
  @ApiProperty({ example: 'Registration successful. Please login to continue.' })
  message: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT to send as "Authorization: Bearer <token>" on protected routes' })
  access_token: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}

export class MeResponseDto {
  @ApiProperty({ example: 'b3f1c2b0-1234-4a5b-9c6d-abcdef012345' })
  id: string;

  @ApiProperty({ example: 'jane.doe@example.com' })
  email: string;

  @ApiProperty({ enum: RoleName, example: RoleName.USER })
  role: RoleName;
}
