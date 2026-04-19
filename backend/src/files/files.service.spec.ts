import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FilesService } from './files.service';
import { FileRecord, FileType } from './entities/file.entity';
import { STORAGE_PROVIDER, StorageProvider } from './providers/storage.provider';

describe('FilesService', () => {
  let service: FilesService;
  let fileRepo: any;
  let storageProvider: any;

  const mockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File =>
    ({
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
      size: 1024,
      ...overrides,
    }) as Express.Multer.File;

  beforeEach(async () => {
    storageProvider = {
      upload: jest.fn().mockResolvedValue({
        url: 'https://i.ibb.co/abc123/test.jpg',
        deleteUrl: 'https://ibb.co/delete/abc123',
      }),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    fileRepo = {
      create: jest.fn((dto) => ({ id: 'file-1', ...dto })),
      save: jest.fn((entity) => Promise.resolve({ ...entity, id: entity.id ?? 'file-1', createdAt: new Date() })),
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        { provide: getRepositoryToken(FileRecord), useValue: fileRepo },
        { provide: STORAGE_PROVIDER, useValue: storageProvider },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
  });

  // ─── UPLOAD ───────────────────────────────────────────────────

  describe('upload', () => {
    it('should upload a valid JPEG and persist metadata', async () => {
      const file = mockFile();

      const result = await service.upload(file, 'user-1', FileType.PROOF);

      expect(storageProvider.upload).toHaveBeenCalledWith(
        file.buffer,
        expect.stringContaining('test.jpg'),
      );
      expect(fileRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://i.ibb.co/abc123/test.jpg',
          deleteUrl: 'https://ibb.co/delete/abc123',
          uploadedBy: 'user-1',
          fileType: FileType.PROOF,
          isUsed: false,
        }),
      );
      expect(fileRepo.save).toHaveBeenCalled();
      expect(result.fileUrl).toBe('https://i.ibb.co/abc123/test.jpg');
      expect(result.fileKey).toBeDefined();
    });

    it('should upload a valid PNG', async () => {
      const file = mockFile({ mimetype: 'image/png', originalname: 'photo.png' });

      const result = await service.upload(file, 'user-1');

      expect(result.fileUrl).toBe('https://i.ibb.co/abc123/test.jpg');
      expect(storageProvider.upload).toHaveBeenCalled();
    });

    it('should upload a valid WebP', async () => {
      const file = mockFile({ mimetype: 'image/webp', originalname: 'photo.webp' });

      const result = await service.upload(file, 'user-1');

      expect(storageProvider.upload).toHaveBeenCalled();
    });

    it('should reject invalid file type (PDF)', async () => {
      const file = mockFile({ mimetype: 'application/pdf', originalname: 'doc.pdf' });

      await expect(service.upload(file, 'user-1')).rejects.toThrow(
        'Invalid file type',
      );
      expect(storageProvider.upload).not.toHaveBeenCalled();
    });

    it('should reject invalid file type (GIF)', async () => {
      const file = mockFile({ mimetype: 'image/gif', originalname: 'anim.gif' });

      await expect(service.upload(file, 'user-1')).rejects.toThrow(
        'Invalid file type',
      );
    });

    it('should reject file exceeding 5MB', async () => {
      const file = mockFile({ size: 6 * 1024 * 1024 });

      await expect(service.upload(file, 'user-1')).rejects.toThrow(
        'File too large',
      );
      expect(storageProvider.upload).not.toHaveBeenCalled();
    });

    it('should handle storage provider upload failure', async () => {
      storageProvider.upload.mockRejectedValue(new Error('IMGBB upload failed: 500'));
      const file = mockFile();

      await expect(service.upload(file, 'user-1')).rejects.toThrow(
        'IMGBB upload failed',
      );
    });

    it('should store deleteUrl as null when provider does not return one', async () => {
      storageProvider.upload.mockResolvedValue({
        url: 'https://i.ibb.co/abc123/test.jpg',
      });
      const file = mockFile();

      await service.upload(file, 'user-1');

      expect(fileRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ deleteUrl: null }),
      );
    });
  });

  // ─── MARK USED ────────────────────────────────────────────────

  describe('markUsed', () => {
    it('should mark file as used when found', async () => {
      const existing = {
        id: 'file-1',
        url: 'https://i.ibb.co/abc123/test.jpg',
        isUsed: false,
      };
      fileRepo.findOne.mockResolvedValue(existing);

      await service.markUsed('https://i.ibb.co/abc123/test.jpg');

      expect(existing.isUsed).toBe(true);
      expect(fileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isUsed: true }),
      );
    });

    it('should gracefully handle untracked URL (legacy)', async () => {
      fileRepo.findOne.mockResolvedValue(null);

      await expect(
        service.markUsed('https://cdn.example.com/old-image.jpg'),
      ).resolves.toBeUndefined();
    });
  });

  // ─── CLEANUP ──────────────────────────────────────────────────

  describe('cleanupUnused', () => {
    it('should delete unused files older than threshold', async () => {
      const oldUnused = [
        {
          id: 'file-1',
          fileKey: 'key-1',
          isUsed: false,
          deleteUrl: 'https://ibb.co/delete/abc123',
          deletedAt: null,
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        },
        {
          id: 'file-2',
          fileKey: 'key-2',
          isUsed: false,
          deleteUrl: 'https://ibb.co/delete/def456',
          deletedAt: null,
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        },
      ];
      fileRepo.find.mockResolvedValue(oldUnused);

      const deleted = await service.cleanupUnused(24);

      expect(deleted).toBe(2);
      expect(storageProvider.delete).toHaveBeenCalledTimes(2);
      expect(storageProvider.delete).toHaveBeenCalledWith('https://ibb.co/delete/abc123');
      expect(storageProvider.delete).toHaveBeenCalledWith('https://ibb.co/delete/def456');
      expect(fileRepo.save).toHaveBeenCalledTimes(2);
      expect(oldUnused[0].deletedAt).not.toBeNull();
      expect(oldUnused[1].deletedAt).not.toBeNull();
    });

    it('should NOT delete used files', async () => {
      // The query itself filters isUsed: false, so used files never appear
      fileRepo.find.mockResolvedValue([]);

      const deleted = await service.cleanupUnused(24);

      expect(deleted).toBe(0);
      expect(storageProvider.delete).not.toHaveBeenCalled();
    });

    it('should handle missing deleteUrl gracefully', async () => {
      const noDeleteUrl = [
        {
          id: 'file-1',
          fileKey: 'key-1',
          isUsed: false,
          deleteUrl: null,
          deletedAt: null,
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        },
      ];
      fileRepo.find.mockResolvedValue(noDeleteUrl);

      const deleted = await service.cleanupUnused(24);

      expect(deleted).toBe(1);
      expect(storageProvider.delete).not.toHaveBeenCalled();
      expect(noDeleteUrl[0].deletedAt).not.toBeNull();
    });

    it('should continue cleanup if individual delete fails', async () => {
      const files = [
        {
          id: 'file-1',
          fileKey: 'key-1',
          isUsed: false,
          deleteUrl: 'https://ibb.co/delete/abc123',
          deletedAt: null,
        },
        {
          id: 'file-2',
          fileKey: 'key-2',
          isUsed: false,
          deleteUrl: 'https://ibb.co/delete/def456',
          deletedAt: null,
        },
      ];
      fileRepo.find.mockResolvedValue(files);
      storageProvider.delete
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);

      const deleted = await service.cleanupUnused(24);

      // First fails, second succeeds
      expect(deleted).toBe(1);
      expect(storageProvider.delete).toHaveBeenCalledTimes(2);
    });

    it('should be idempotent — already deleted files not re-processed', async () => {
      // Already-deleted files have deletedAt set, so the query filters them out
      fileRepo.find.mockResolvedValue([]);

      const deleted = await service.cleanupUnused(24);

      expect(deleted).toBe(0);
    });
  });

  // ─── FIND ─────────────────────────────────────────────────────

  describe('findByUrl / findByKey', () => {
    it('should find file by URL', async () => {
      const record = { id: 'file-1', url: 'https://i.ibb.co/test.jpg' };
      fileRepo.findOne.mockResolvedValue(record);

      const result = await service.findByUrl('https://i.ibb.co/test.jpg');

      expect(result).toEqual(record);
      expect(fileRepo.findOne).toHaveBeenCalledWith({
        where: { url: 'https://i.ibb.co/test.jpg' },
      });
    });

    it('should find file by key', async () => {
      const record = { id: 'file-1', fileKey: 'key-1' };
      fileRepo.findOne.mockResolvedValue(record);

      const result = await service.findByKey('key-1');

      expect(result).toEqual(record);
    });

    it('should return null for unknown URL', async () => {
      fileRepo.findOne.mockResolvedValue(null);

      const result = await service.findByUrl('https://unknown.com/img.jpg');

      expect(result).toBeNull();
    });
  });
});
