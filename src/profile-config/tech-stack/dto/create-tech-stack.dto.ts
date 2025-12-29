import { IsString, MinLength } from 'class-validator';

export class CreateTechStackDto {
  @IsString()
  @MinLength(2)
  name: string;
}
