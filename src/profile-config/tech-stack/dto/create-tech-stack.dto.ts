import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateTechStackDto {
  @ApiProperty({
    description: 'Tech stack name (must be unique)',
    example: 'Node.js',
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  name: string;
}
