import { IsString, IsUrl, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteJobDto {
  @ApiProperty({ example: 'https://cdn.example.com/proof/abc123.jpg' })
  @IsString()
  @IsUrl()
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
}
