import { IsString, MinLength } from 'class-validator';

export class CreateHobbyDto {
  @IsString()
  @MinLength(2)
  name: string;
}
