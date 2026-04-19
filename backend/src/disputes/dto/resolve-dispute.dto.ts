import { IsString, IsNotEmpty, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DisputeStatus } from '../../common/enums/dispute-status.enum';

export class ResolveDisputeDto {
  @ApiProperty({
    enum: [DisputeStatus.RESOLVED_ACCEPTED, DisputeStatus.RESOLVED_REJECTED],
    example: DisputeStatus.RESOLVED_ACCEPTED,
  })
  @IsEnum(DisputeStatus)
  resolution: DisputeStatus.RESOLVED_ACCEPTED | DisputeStatus.RESOLVED_REJECTED;

  @ApiProperty({ example: 'Verified: proof image shows incomplete pickup' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  adminNotes: string;
}
