import { ApiProperty } from '@nestjs/swagger';
import { LeadType, LeadStatus, LeadSource, SMSSStatus } from '../entities';

export class LeadResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  marketerId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  phone: string;

  @ApiProperty({ enum: LeadType })
  type: LeadType;

  @ApiProperty({ nullable: true })
  area: string | null;

  @ApiProperty({ enum: LeadSource })
  source: LeadSource;

  @ApiProperty()
  referralCode: string;

  @ApiProperty({ enum: LeadStatus })
  status: LeadStatus;

  @ApiProperty()
  invitedAt: Date;

  @ApiProperty({ nullable: true })
  registeredAt: Date | null;

  @ApiProperty({ nullable: true })
  qualifiedAt: Date | null;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty({ enum: SMSSStatus })
  smsStatus: SMSSStatus;

  @ApiProperty({ nullable: true })
  smsSentAt: Date | null;

  @ApiProperty()
  smsRetryCount: number;

  @ApiProperty({ nullable: true })
  registeredUserId: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
