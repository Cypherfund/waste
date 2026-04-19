import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ManualAssignDto {
  @ApiProperty({ example: 'uuid-of-collector' })
  @IsString()
  @IsUUID()
  collectorId: string;
}
