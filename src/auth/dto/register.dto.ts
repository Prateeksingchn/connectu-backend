import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  MinLength,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleName } from '../../profile-config/roles/role.enum';

export class RegisterDto {
  @ApiProperty({
    example: 'jane.doe@example.com',
    description: 'Must be unique; registration fails with 409 if already taken',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Str0ngPassw0rd!',
    minLength: 6,
    description: 'Hashed with bcrypt before storage',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Jane Doe', minLength: 2 })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({
    enum: RoleName,
    default: RoleName.USER,
    description: 'Defaults to USER when omitted',
  })
  @IsOptional()
  @IsEnum(RoleName)
  role?: RoleName;

  @ApiProperty({
    example: 1,
    description: 'Must reference an existing Gender id (400 if invalid)',
  })
  @IsInt()
  genderId: number;

  @ApiProperty({
    example: [1, 2],
    type: [Number],
    description:
      'At least one existing Interest id is required (400 if any id is invalid)',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one interest is required' })
  @IsInt({ each: true, message: 'Interest IDs must be numbers' })
  interests: number[];

  @ApiProperty({
    example: [1, 3],
    type: [Number],
    description:
      'At least one existing Hobby id is required (400 if any id is invalid)',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one hobby is required' })
  @IsInt({ each: true, message: 'Hobby IDs must be numbers' })
  hobbies: number[];

  @ApiProperty({
    example: [2, 4],
    type: [Number],
    description:
      'At least one existing TechStack id is required (400 if any id is invalid)',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one tech stack is required' })
  @IsInt({ each: true, message: 'Tech stack IDs must be numbers' })
  techStack: number[];
}
