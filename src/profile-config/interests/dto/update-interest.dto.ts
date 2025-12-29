import { IsString, MinLength, IsOptional } from 'class-validator';

export class UpdateInterestDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}
