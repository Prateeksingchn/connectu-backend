import { IsString, MinLength, IsOptional } from 'class-validator';

export class UpdateTechStackDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}
