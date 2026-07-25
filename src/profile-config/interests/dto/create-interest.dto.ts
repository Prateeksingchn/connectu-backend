import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateInterestDto {
  @ApiProperty({
    description: 'Interest name (must be unique)',
    example: 'Traveling',
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  name: string;
}
