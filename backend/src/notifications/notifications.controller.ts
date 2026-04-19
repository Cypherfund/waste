import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { NotificationFilterDto } from './dto/notification-filter.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { PaginatedResponse } from '../common/dto/pagination.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications (paginated, optional unreadOnly filter)' })
  @ApiResponse({ status: 200, description: 'Paginated list of notifications' })
  async getNotifications(
    @CurrentUser() user: JwtPayload,
    @Query() filter: NotificationFilterDto,
  ): Promise<PaginatedResponse<NotificationResponseDto>> {
    return this.notificationsService.getNotifications(user.sub, filter);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read', type: NotificationResponseDto })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({ status: 403, description: 'Not your notification' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsRead(id, user.sub);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all my notifications as read' })
  @ApiResponse({ status: 200, description: 'Count of notifications marked as read' })
  async markAllAsRead(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ count: number }> {
    return this.notificationsService.markAllAsRead(user.sub);
  }
}
