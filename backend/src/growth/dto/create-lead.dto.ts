import {
  IsString,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  MaxLength,
  MinLength,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadType, LeadSource } from '../entities';

export class CreateLeadDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the lead' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '+237670000000', description: 'Phone number with country code' })
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ enum: LeadType, example: LeadType.HOUSEHOLD })
  @IsEnum(LeadType)
  type: LeadType;

  @ApiPropertyOptional({ example: 'Bonapriso', description: 'Area or neighborhood' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  area?: string;

  @ApiPropertyOptional({ example: 'Interested in weekly collection' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ enum: LeadSource, default: LeadSource.FIELD })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @ApiPropertyOptional({ example: 'uuid-of-campaign', description: 'Campaign ID for attribution' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;
}
