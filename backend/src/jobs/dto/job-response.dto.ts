import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus } from '../../common/enums/job-status.enum';
import { PricingType } from '../../common/enums/pricing-type.enum';

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

  @ApiPropertyOptional({ nullable: true })
  collectorPhone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  collectorRating?: number | null;

  @ApiPropertyOptional({ nullable: true })
  collectorAvatarUrl?: string | null;

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
  paymentMode: string | null;

  @ApiPropertyOptional({ nullable: true })
  paymentMethod: string | null;

  @ApiPropertyOptional({ nullable: true })
  paymentMethodName: string | null;

  @ApiPropertyOptional({ nullable: true })
  paymentRef: string | null;

  @ApiPropertyOptional({ nullable: true })
  paymentProofUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  paymentStatus: string | null;

  @ApiPropertyOptional({ nullable: true })
  quotedPrice: number | null;

  @ApiPropertyOptional({ enum: PricingType, nullable: true })
  pricingType: PricingType | null;

  @ApiPropertyOptional({ nullable: true })
  isCoveredBySubscription: boolean | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Actual amount the collector will earn (after platform share)',
  })
  collectorEarnings: number | null;

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
