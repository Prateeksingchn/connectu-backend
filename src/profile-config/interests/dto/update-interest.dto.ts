import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional } from 'class-validator';

export class UpdateInterestDto {
  @ApiPropertyOptional({
    description: 'New interest name (must be unique)',
    example: 'Traveling',
    minLength: 2,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}
