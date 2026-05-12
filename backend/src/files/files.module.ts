import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FileRecord } from './entities/file.entity';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { ImgbbProvider } from './providers/imgbb.provider';
import { LocalProvider } from './providers/local.provider';
import { STORAGE_PROVIDER } from './providers/storage.provider';

@Module({
  imports: [TypeOrmModule.forFeature([FileRecord]), ConfigModule],
  controllers: [FilesController],
  providers: [
    FilesService,
    {
      provide: STORAGE_PROVIDER,
      useFactory: (configService: ConfigService) => {
        const storageType = configService.get('STORAGE_TYPE', 'local');
        return storageType === 'imgbb' ? new ImgbbProvider(configService) : new LocalProvider(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [FilesService],
})
export class FilesModule {}
