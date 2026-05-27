import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppVersion } from './entities/app-version.entity';
import { AppUpdatesService } from './app-updates.service';
import { AppUpdatesController } from './app-updates.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AppVersion]),
    NotificationsModule,
    UsersModule,
    WebSocketModule,
  ],
  controllers: [AppUpdatesController],
  providers: [AppUpdatesService],
  exports: [AppUpdatesService],
})
export class AppUpdatesModule {}
