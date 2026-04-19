import { ApiProperty } from '@nestjs/swagger';
import { DayOfWeek } from '../../common/enums/day-of-week.enum';

export class AvailabilityResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  collectorId: string;

  @ApiProperty({ enum: DayOfWeek })
  dayOfWeek: DayOfWeek;

  @ApiProperty({ example: '08:00' })
  startTime: string;

  @ApiProperty({ example: '12:00' })
  endTime: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
