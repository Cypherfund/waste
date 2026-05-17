import { ApiProperty } from '@nestjs/swagger';
import { MarketerStatus } from '../entities';

export class MarketerResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  phone: string;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty()
  referralCode: string;

  @ApiProperty({ nullable: true })
  territory: string | null;

  @ApiProperty({ enum: MarketerStatus })
  status: MarketerStatus;

  @ApiProperty()
  totalLeads: number;

  @ApiProperty()
  totalRegistered: number;

  @ApiProperty()
  totalQualified: number;

  @ApiProperty()
  totalExpired: number;

  @ApiProperty()
  conversionRate: number;

  @ApiProperty()
  qualificationRate: number;

  @ApiProperty()
  totalEarned: number;

  @ApiProperty()
  totalPaid: number;

  @ApiProperty()
  pendingAmount: number;

  @ApiProperty()
  approvedAmount: number;

  @ApiProperty()
  dailyLeadsCreated: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
