import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional } from 'class-validator';

export class UpdateHobbyDto {
  @ApiPropertyOptional({
    description: 'New hobby name (must be unique)',
    example: 'Photography',
    minLength: 2,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}
