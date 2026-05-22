import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignSchemesDto {
  @ApiProperty({ example: ['uuid-1', 'uuid-2'], description: 'Array of commission scheme IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  schemeIds: string[];
}
