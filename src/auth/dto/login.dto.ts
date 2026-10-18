import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'jane.doe@example.com',
    description: 'Registered account email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Str0ngPassw0rd!',
    description: 'Account password (plaintext, compared against bcrypt hash)',
  })
  @IsString()
  password: string;
}
