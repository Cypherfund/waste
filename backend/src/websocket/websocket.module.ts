import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocationUpdate } from './entities/location-update.entity';
import { Job } from '../jobs/entities/job.entity';
import { User } from '../users/entities/user.entity';
import { LocationService } from './location.service';
import { WsJwtGuard } from './websocket.guard';
import { AppWebSocketGateway } from './websocket.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([LocationUpdate, Job, User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
      }),
    }),
  ],
  providers: [LocationService, WsJwtGuard, AppWebSocketGateway],
  exports: [LocationService],
})
export class WebSocketModule {}
