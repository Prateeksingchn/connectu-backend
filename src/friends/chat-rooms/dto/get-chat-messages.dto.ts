import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetChatMessagesDto {
  @ApiPropertyOptional({
    description: 'Maximum number of messages to return. Defaults to 50, capped at 100.',
    example: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Cursor for backward pagination: return messages strictly older than this createdAt timestamp (ISO 8601). Pass the createdAt of the oldest message from the previous page to fetch the next page.',
    example: '2026-07-24T18:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  before?: string;
}
