import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileRecord } from './entities/file.entity';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { ImgbbProvider } from './providers/imgbb.provider';
import { STORAGE_PROVIDER } from './providers/storage.provider';

@Module({
  imports: [TypeOrmModule.forFeature([FileRecord])],
  controllers: [FilesController],
  providers: [
    FilesService,
    {
      provide: STORAGE_PROVIDER,
      useClass: ImgbbProvider,
    },
  ],
  exports: [FilesService],
})
export class FilesModule {}
