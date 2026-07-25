import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional } from 'class-validator';

export class UpdateTechStackDto {
  @ApiPropertyOptional({
    description: 'New tech stack name (must be unique)',
    example: 'Node.js',
    minLength: 2,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}
