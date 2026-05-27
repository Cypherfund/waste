import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AppUpdatesService } from './app-updates.service';
import { CheckUpdateDto } from './dto/check-update.dto';
import { CreateAppVersionDto } from './dto/create-app-version.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';

@Controller('app-updates')
export class AppUpdatesController {
  constructor(private readonly service: AppUpdatesService) {}

  // ── PUBLIC ────────────────────────────────────────────────────

  @Public()
  @Post('check')
  @HttpCode(HttpStatus.OK)
  checkUpdate(@Body() dto: CheckUpdateDto) {
    return this.service.checkUpdate(dto);
  }

  // ── ADMIN ─────────────────────────────────────────────────────

  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateAppVersionDto) {
    return this.service.create(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateAppVersionDto>) {
    return this.service.update(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  publish(@Param('id', ParseIntPipe) id: number) {
    return this.service.publish(id);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/send-notification')
  @HttpCode(HttpStatus.OK)
  sendNotification(@Param('id', ParseIntPipe) id: number) {
    return this.service.sendUpdateNotification(id);
  }
}
