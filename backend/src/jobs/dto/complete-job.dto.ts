import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteJobDto {
  @ApiProperty({ example: 'https://cdn.example.com/proof/abc123.jpg' })
  @IsString()
  proofImageUrl: string;

  @ApiPropertyOptional({ example: 4.0435 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  collectorLat?: number;

  @ApiPropertyOptional({ example: 9.6966 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  collectorLng?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Required for CASH jobs: confirm cash was collected from household',
  })
  @IsOptional()
  @IsBoolean()
  cashCollected?: boolean;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Amount collected in cash (audit only; should equal quotedPrice)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  collectedAmount?: number;

  @ApiPropertyOptional({
    example: 3500,
    description: 'Required for CASH_ON_FIRST_PICKUP jobs: exact subscription cash amount collected',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cashCollectedAmount?: number;
}
