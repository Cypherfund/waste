import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { FcmProvider } from './providers/fcm.provider';
import { SmsProvider } from './providers/sms.provider';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    UsersModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, FcmProvider, SmsProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
