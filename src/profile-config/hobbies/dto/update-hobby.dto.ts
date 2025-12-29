import { IsString, MinLength, IsOptional } from 'class-validator';

export class UpdateHobbyDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}
