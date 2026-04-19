import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        autoLoadEntities: true,
        synchronize: configService.get<string>('nodeEnv') === 'development',
        logging: configService.get<string>('nodeEnv') === 'development' ? ['error', 'warn'] : false,
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsRun: configService.get<string>('nodeEnv') !== 'development',
        ssl: configService.get<string>('nodeEnv') === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),
  ],
})
export class DatabaseModule {}
