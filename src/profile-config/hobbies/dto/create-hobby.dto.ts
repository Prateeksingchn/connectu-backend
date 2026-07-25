import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateHobbyDto {
  @ApiProperty({
    description: 'Hobby name (must be unique)',
    example: 'Photography',
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  name: string;
}
