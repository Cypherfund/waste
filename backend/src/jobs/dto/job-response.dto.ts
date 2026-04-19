import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus } from '../../common/enums/job-status.enum';

export class JobResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  householdId: string;

  @ApiPropertyOptional()
  householdName?: string;

  @ApiPropertyOptional({ nullable: true })
  collectorId: string | null;

  @ApiPropertyOptional({ nullable: true })
  collectorName?: string | null;

  @ApiProperty({ enum: JobStatus })
  status: JobStatus;

  @ApiProperty()
  scheduledDate: string;

  @ApiProperty()
  scheduledTime: string;

  @ApiProperty()
  locationAddress: string;

  @ApiPropertyOptional({ nullable: true })
  locationLat: number | null;

  @ApiPropertyOptional({ nullable: true })
  locationLng: number | null;

  @ApiPropertyOptional({ nullable: true })
  notes: string | null;

  @ApiPropertyOptional({ nullable: true })
  assignedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  startedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  completedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  validatedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  cancelledAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
