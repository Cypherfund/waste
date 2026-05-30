import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';
import { StorageProvider, UploadResult } from './storage.provider';

@Injectable()
export class LocalProvider implements StorageProvider {
  private readonly logger = new Logger(LocalProvider.name);
  private readonly uploadsDir: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadsDir = this.configService.get<string>('UPLOADS_DIR', './uploads');
    this.baseUrl = this.configService.get<string>('BASE_URL', 'http://localhost:3000');
    this.ensureUploadsDir();
  }

  private async ensureUploadsDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create uploads directory: ${error.message}`);
    }
  }

  async upload(file: Buffer, filename: string): Promise<UploadResult> {
    const uniqueFilename = `${Date.now()}-${filename}`;
    const filePath = join(this.uploadsDir, uniqueFilename);

    try {
      await fs.writeFile(filePath, file);
      // Ensure the URL is properly formatted with protocol
      let url = this.baseUrl;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `http://${url}`;
      }
      url = `${url}/uploads/${uniqueFilename}`;

      this.logger.log(`File uploaded successfully: ${uniqueFilename}`);
      return { url };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async delete(deleteUrl: string): Promise<void> {
    try {
      const filename = deleteUrl.split('/').pop();
      if (!filename) {
        this.logger.warn(`Invalid delete URL: ${deleteUrl}`);
        return;
      }
      const filePath = join(this.uploadsDir, filename);
      await fs.unlink(filePath);
      this.logger.log(`File deleted successfully: ${filename}`);
    } catch (error) {
      this.logger.warn(`Failed to delete file: ${error.message}`);
    }
  }
}
