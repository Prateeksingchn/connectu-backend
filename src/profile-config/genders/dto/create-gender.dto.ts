import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateGenderDto {
  @ApiProperty({
    description: 'Gender name (must be unique)',
    example: 'Non-binary',
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  name: string;
}
