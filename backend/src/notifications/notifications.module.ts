import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { FcmProvider } from './providers/fcm.provider';
import { EmailProvider } from './providers/email.provider';
import { TermiiProvider } from './providers/termii.provider';
import { AfricasTalkingProvider } from './providers/africas-talking.provider';
import { WhatsAppProvider } from './providers/whatsapp.provider';
import { StubSmsProvider, SMS_PROVIDER } from './providers/sms.provider';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), UsersModule, ConfigModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    FcmProvider,
    EmailProvider,
    {
      provide: SMS_PROVIDER,
      useFactory: (configService: ConfigService) => {
        const smsProvider = configService.get('SMS_PROVIDER', 'stub');
        switch (smsProvider) {
          case 'termii':
            return new TermiiProvider(configService);
          case 'africas-talking':
            return new AfricasTalkingProvider(configService);
          case 'whatsapp':
            return new WhatsAppProvider(configService);
          case 'stub':
          default:
            return new StubSmsProvider();
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [NotificationsService, FcmProvider, EmailProvider, SMS_PROVIDER],
})
export class NotificationsModule {}
