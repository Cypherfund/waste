import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, UploadResult } from './storage.provider';

@Injectable()
export class ImgbbProvider implements StorageProvider {
  private readonly logger = new Logger(ImgbbProvider.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.imgbb.com/1/upload';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('IMGBB_API_KEY', '');
  }

  async upload(file: Buffer, filename: string): Promise<UploadResult> {
    const base64 = file.toString('base64');

    const formData = new URLSearchParams();
    formData.append('key', this.apiKey);
    formData.append('image', base64);
    formData.append('name', filename);

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`IMGBB upload failed: ${response.status} ${text}`);
      throw new Error(`IMGBB upload failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      this.logger.error(`IMGBB upload failed: ${JSON.stringify(data)}`);
      throw new Error('IMGBB upload failed');
    }

    return {
      url: data.data.display_url,
      deleteUrl: data.data.delete_url ?? undefined,
    };
  }

  async delete(deleteUrl: string): Promise<void> {
    try {
      const response = await fetch(deleteUrl, { method: 'GET' });
      if (!response.ok) {
        this.logger.warn(`IMGBB delete returned ${response.status} for ${deleteUrl}`);
      }
    } catch (err) {
      this.logger.warn(`IMGBB delete failed for ${deleteUrl}: ${err.message}`);
    }
  }
}
