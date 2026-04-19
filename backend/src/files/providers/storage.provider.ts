export interface UploadResult {
  url: string;
  deleteUrl?: string;
}

export interface StorageProvider {
  upload(file: Buffer, filename: string): Promise<UploadResult>;
  delete(deleteUrl: string): Promise<void>;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
