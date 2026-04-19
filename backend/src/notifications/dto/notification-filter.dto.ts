import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class NotificationFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Show only unread notifications' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  unreadOnly?: boolean;
}
