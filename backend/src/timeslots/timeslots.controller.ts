import {
  Controller,
  Post,
  Get,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TimeslotsService } from './timeslots.service';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { AvailabilityResponseDto } from './dto/availability-response.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/role.enum';

@ApiTags('Timeslots')
@ApiBearerAuth()
@Controller('timeslots')
export class TimeslotsController {
  constructor(private readonly timeslotsService: TimeslotsService) {}

  @Post()
  @ApiOperation({ summary: 'Set collector availability slots (COLLECTOR only)' })
  @ApiResponse({ status: 201, description: 'Slots created', type: [AvailabilityResponseDto] })
  @ApiResponse({ status: 400, description: 'Invalid time range' })
  @ApiResponse({ status: 409, description: 'Overlapping slot' })
  async setAvailability(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SetAvailabilityDto,
  ): Promise<AvailabilityResponseDto[]> {
    if (user.role !== UserRole.COLLECTOR) {
      throw new ForbiddenException('Only collectors can set availability');
    }
    return this.timeslotsService.setAvailability(user.sub, dto.slots);
  }

  @Get()
  @ApiOperation({ summary: 'Get my availability slots (COLLECTOR only)' })
  @ApiResponse({ status: 200, description: 'List of availability slots', type: [AvailabilityResponseDto] })
  async getAvailability(
    @CurrentUser() user: JwtPayload,
  ): Promise<AvailabilityResponseDto[]> {
    if (user.role !== UserRole.COLLECTOR) {
      throw new ForbiddenException('Only collectors can view availability');
    }
    return this.timeslotsService.getAvailability(user.sub);
  }
}
