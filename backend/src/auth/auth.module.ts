import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OtpService } from './otp.service';
import { RedisModule } from '../redis/redis.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GrowthModule } from '../growth/growth.module';
import { SystemConfigModule } from '../config/system-config.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<number>('jwt.accessExpiration'),
        },
      }),
    }),
    TypeOrmModule.forFeature([User]),
    RedisModule,
    NotificationsModule,
    SystemConfigModule,
    forwardRef(() => GrowthModule),
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, AuthService, OtpService],
  exports: [JwtModule, PassportModule, AuthService, OtpService],
})
export class AuthModule {}
