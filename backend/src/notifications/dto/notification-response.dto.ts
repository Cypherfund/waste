import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel, NotificationStatus } from '../../common/enums/notification-channel.enum';

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  body: string;

  @ApiProperty()
  data: Record<string, any>;

  @ApiProperty({ enum: NotificationChannel })
  channel: NotificationChannel;

  @ApiProperty({ enum: NotificationStatus })
  status: NotificationStatus;

  @ApiPropertyOptional()
  sentAt: Date | null;

  @ApiPropertyOptional()
  readAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}
