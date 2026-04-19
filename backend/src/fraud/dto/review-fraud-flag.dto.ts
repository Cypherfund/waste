import { IsString, IsNotEmpty, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FraudFlagStatus } from '../../common/enums/fraud-type.enum';

export class ReviewFraudFlagDto {
  @ApiProperty({
    enum: [FraudFlagStatus.DISMISSED, FraudFlagStatus.CONFIRMED],
    example: FraudFlagStatus.CONFIRMED,
  })
  @IsEnum(FraudFlagStatus)
  resolution: FraudFlagStatus.DISMISSED | FraudFlagStatus.CONFIRMED;

  @ApiProperty({ example: 'GPS coordinates confirmed far from job location' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reviewNotes: string;
}
