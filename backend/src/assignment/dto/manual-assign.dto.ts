import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ManualAssignDto {
  @ApiProperty({ description: 'UUID of the collector to assign' })
  @IsUUID()
  collectorId: string;
}
