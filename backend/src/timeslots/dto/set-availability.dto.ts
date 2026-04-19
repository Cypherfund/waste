import {
  IsEnum,
  IsString,
  Matches,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek } from '../../common/enums/day-of-week.enum';

export class AvailabilitySlotDto {
  @ApiProperty({ enum: DayOfWeek, example: DayOfWeek.MON })
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty({ example: '08:00', description: 'HH:mm format' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime: string;

  @ApiProperty({ example: '12:00', description: 'HH:mm format' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SetAvailabilityDto {
  @ApiProperty({ type: [AvailabilitySlotDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  slots: AvailabilitySlotDto[];
}
