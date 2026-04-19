import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FileType } from '../entities/file.entity';

export class UploadFileDto {
  @ApiPropertyOptional({ enum: FileType, default: FileType.OTHER })
  @IsOptional()
  @IsEnum(FileType)
  fileType?: FileType;
}
