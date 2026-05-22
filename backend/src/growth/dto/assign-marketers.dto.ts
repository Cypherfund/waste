import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignMarketersDto {
  @ApiProperty({ example: ['uuid-1', 'uuid-2'], description: 'Array of marketer profile IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  marketerProfileIds: string[];
}
