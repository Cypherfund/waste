import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { StorageProvider, UploadResult } from './storage.provider';

@Injectable()
export class CloudinaryProvider implements StorageProvider {
  private readonly logger = new Logger(CloudinaryProvider.name);

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async upload(file: Buffer, filename: string): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            public_id: filename,
            resource_type: 'image',
            folder: 'waste-management',
          },
          (error: any, result: any) => {
            if (error) {
              this.logger.error(`Cloudinary upload failed: ${error.message}`);
              reject(new Error(`Cloudinary upload failed: ${error.message}`));
            } else {
              this.logger.log(`File uploaded successfully: ${result.public_id}`);
              resolve({
                url: result.secure_url,
                deleteUrl: result.public_id,
              });
            }
          },
        )
        .end(file);
    });
  }

  async delete(deleteUrl: string): Promise<void> {
    try {
      // deleteUrl is the public_id for Cloudinary
      const result = await cloudinary.uploader.destroy(deleteUrl, {
        resource_type: 'image',
      });
      if (result.result !== 'ok') {
        this.logger.warn(`Cloudinary delete returned ${result.result} for ${deleteUrl}`);
      } else {
        this.logger.log(`File deleted successfully: ${deleteUrl}`);
      }
    } catch (err) {
      this.logger.warn(`Cloudinary delete failed for ${deleteUrl}: ${err.message}`);
    }
  }
}
