import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FileType } from './entities/file.entity';

@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        fileType: { type: 'string', enum: ['PROOF', 'AVATAR', 'OTHER'] },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('sub') userId: string,
    @Body('fileType') fileType?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const type =
      fileType && Object.values(FileType).includes(fileType as FileType)
        ? (fileType as FileType)
        : FileType.OTHER;

    return this.filesService.upload(file, userId, type);
  }
}
