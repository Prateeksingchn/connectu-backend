import { ApiProperty } from '@nestjs/swagger';

/** Generic shape for endpoints that only return a confirmation message. */
export class MessageResponseDto {
  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;
}
