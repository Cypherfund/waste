import { IsInt, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRatingDto {
  @ApiProperty({ example: 4, minimum: 1, maximum: 5, description: 'Rating value (1-5 stars)' })
  @IsInt()
  @Min(1)
  @Max(5)
  value: number;

  @ApiPropertyOptional({ example: 'Great service, very punctual!', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class RatingResponseDto {
  id: string;
  jobId: string;
  householdId: string;
  collectorId: string;
  value: number;
  comment: string | null;
  createdAt: Date;
}
