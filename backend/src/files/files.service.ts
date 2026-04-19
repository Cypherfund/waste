import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { FileRecord, FileType } from './entities/file.entity';
import { StorageProvider, STORAGE_PROVIDER } from './providers/storage.provider';

const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectRepository(FileRecord)
    private readonly fileRepo: Repository<FileRecord>,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
  ) {}

  /**
   * Upload a file: validate, send to storage provider, persist metadata.
   */
  async upload(
    file: Express.Multer.File,
    uploadedBy: string,
    fileType: FileType = FileType.OTHER,
  ): Promise<{ fileKey: string; fileUrl: string }> {
    // Validate mimetype
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIMETYPES.join(', ')}`,
      );
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large: ${file.size} bytes. Max: ${MAX_FILE_SIZE} bytes (5MB)`,
      );
    }

    const fileKey = uuidv4();
    const filename = `${fileKey}-${file.originalname}`;

    // Upload to storage provider
    const result = await this.storageProvider.upload(file.buffer, filename);

    // Persist file metadata
    const record = this.fileRepo.create({
      fileKey,
      url: result.url,
      deleteUrl: result.deleteUrl ?? null,
      uploadedBy,
      fileType,
      isUsed: false,
    });

    await this.fileRepo.save(record);

    this.logger.log(`File uploaded: key=${fileKey} type=${fileType} by=${uploadedBy}`);

    return {
      fileKey: record.fileKey,
      fileUrl: record.url,
    };
  }

  /**
   * Mark a file as used (e.g., linked to a proof).
   */
  async markUsed(fileUrl: string): Promise<void> {
    const record = await this.fileRepo.findOne({ where: { url: fileUrl } });
    if (!record) return; // graceful — legacy URLs may not be tracked
    record.isUsed = true;
    await this.fileRepo.save(record);
  }

  /**
   * Validate that a file URL is tracked in the Files module.
   * Returns the file record if found, null otherwise.
   */
  async findByUrl(url: string): Promise<FileRecord | null> {
    return this.fileRepo.findOne({ where: { url } });
  }

  /**
   * Find a file by its key.
   */
  async findByKey(fileKey: string): Promise<FileRecord | null> {
    return this.fileRepo.findOne({ where: { fileKey } });
  }

  /**
   * Cleanup unused files older than threshold hours.
   * NEVER deletes files where isUsed = true.
   * Idempotent: already soft-deleted files are skipped.
   */
  async cleanupUnused(thresholdHours: number): Promise<number> {
    const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

    const unused = await this.fileRepo.find({
      where: {
        isUsed: false,
        deletedAt: IsNull(),
        createdAt: LessThan(cutoff),
      },
    });

    let deleted = 0;

    for (const file of unused) {
      try {
        // Call storage provider delete if deleteUrl exists
        if (file.deleteUrl) {
          await this.storageProvider.delete(file.deleteUrl);
        }

        // Soft-delete
        file.deletedAt = new Date();
        await this.fileRepo.save(file);
        deleted++;

        this.logger.log(`Cleaned up file ${file.fileKey}`);
      } catch (err) {
        this.logger.warn(
          `Failed to cleanup file ${file.fileKey}: ${err.message}`,
        );
      }
    }

    this.logger.log(`Cleanup complete: ${deleted}/${unused.length} files removed`);
    return deleted;
  }
}
