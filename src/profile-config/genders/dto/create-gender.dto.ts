import { IsString, MinLength } from 'class-validator';

export class CreateGenderDto {
  @IsString()
  @MinLength(2)
  name: string;
}

