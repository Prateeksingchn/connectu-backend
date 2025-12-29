import { IsEmail, IsEnum, IsOptional, IsString, IsInt, MinLength, IsArray, ArrayMinSize } from 'class-validator';
import { RoleName } from '../../profile-config/roles/role.enum';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsEnum(RoleName)
  role?: RoleName;

  @IsInt()
  genderId: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one interest is required' })
  @IsInt({ each: true, message: 'Interest IDs must be numbers' })
  interests: number[];

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one hobby is required' })
  @IsInt({ each: true, message: 'Hobby IDs must be numbers' })
  hobbies: number[];

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one tech stack is required' })
  @IsInt({ each: true, message: 'Tech stack IDs must be numbers' })
  techStack: number[];
}
