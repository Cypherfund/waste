import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminAuditService } from './admin-audit.service';
import { AdminAuditLog } from '../entities/admin-audit-log.entity';
import { Repository } from 'typeorm';

describe('AdminAuditService', () => {
  let service: AdminAuditService;
  let auditLogRepo: jest.Mocked<Repository<AdminAuditLog>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuditService,
        {
          provide: getRepositoryToken(AdminAuditLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminAuditService>(AdminAuditService);
    auditLogRepo = module.get(getRepositoryToken(AdminAuditLog));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create and save an audit log', async () => {
      const mockLog = {
        id: 'log-1',
        adminId: 'admin-1',
        action: 'PAYMENT_APPROVED',
        entityType: 'JOB',
        entityId: 'job-1',
        oldValue: { status: 'PENDING' },
        newValue: { status: 'VERIFIED' },
        metadata: {},
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        createdAt: new Date(),
      };

      auditLogRepo.create.mockReturnValue(mockLog as any);
      auditLogRepo.save.mockResolvedValue(mockLog as any);

      await service.log({
        adminId: 'admin-1',
        action: 'PAYMENT_APPROVED' as any,
        entityType: 'JOB' as any,
        entityId: 'job-1',
        oldValue: { status: 'PENDING' },
        newValue: { status: 'VERIFIED' },
        metadata: {},
        context: { ipAddress: '127.0.0.1', userAgent: 'test-agent' },
      });

      expect(auditLogRepo.create).toHaveBeenCalled();
      expect(auditLogRepo.save).toHaveBeenCalledWith(mockLog);
    });

    it('should sanitize sensitive fields in oldValue', async () => {
      const mockLog = {
        id: 'log-1',
        adminId: 'admin-1',
        action: 'SYSTEM_CONFIG_UPDATED',
        entityType: 'SYSTEM_CONFIG',
        entityId: 'config-key',
        oldValue: { value: '[REDACTED]' },
        newValue: { value: 'new-value' },
        metadata: {},
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        createdAt: new Date(),
      };

      auditLogRepo.create.mockReturnValue(mockLog as any);
      auditLogRepo.save.mockResolvedValue(mockLog as any);

      await service.log({
        adminId: 'admin-1',
        action: 'SYSTEM_CONFIG_UPDATED' as any,
        entityType: 'SYSTEM_CONFIG' as any,
        entityId: 'config-key',
        oldValue: { value: 'secret-password' },
        newValue: { value: 'new-value' },
        metadata: {},
        context: { ipAddress: '127.0.0.1', userAgent: 'test-agent' },
      });

      expect(auditLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          oldValue: { value: '[REDACTED]' },
        }),
      );
    });

    it('should sanitize sensitive fields in newValue', async () => {
      const mockLog = {
        id: 'log-1',
        adminId: 'admin-1',
        action: 'PAYMENT_PROVIDER_CREATED',
        entityType: 'PAYMENT_PROVIDER',
        entityId: '1',
        oldValue: null,
        newValue: { apiKey: '[REDACTED]', name: 'Test Provider' },
        metadata: {},
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        createdAt: new Date(),
      };

      auditLogRepo.create.mockReturnValue(mockLog as any);
      auditLogRepo.save.mockResolvedValue(mockLog as any);

      await service.log({
        adminId: 'admin-1',
        action: 'PAYMENT_PROVIDER_CREATED' as any,
        entityType: 'PAYMENT_PROVIDER' as any,
        entityId: '1',
        oldValue: null,
        newValue: { apiKey: 'secret-key-123', name: 'Test Provider' },
        metadata: {},
        context: { ipAddress: '127.0.0.1', userAgent: 'test-agent' },
      });

      expect(auditLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          newValue: { apiKey: '[REDACTED]', name: 'Test Provider' },
        }),
      );
    });

    it('should sanitize multiple sensitive fields', async () => {
      const mockLog = {
        id: 'log-1',
        adminId: 'admin-1',
        action: 'SYSTEM_CONFIG_UPDATED',
        entityType: 'SYSTEM_CONFIG',
        entityId: 'config-key',
        oldValue: { password: '[REDACTED]', token: '[REDACTED]', safeField: 'value' },
        newValue: { apiKey: '[REDACTED]', secret: '[REDACTED]', safeField: 'new-value' },
        metadata: {},
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        createdAt: new Date(),
      };

      auditLogRepo.create.mockReturnValue(mockLog as any);
      auditLogRepo.save.mockResolvedValue(mockLog as any);

      await service.log({
        adminId: 'admin-1',
        action: 'SYSTEM_CONFIG_UPDATED' as any,
        entityType: 'SYSTEM_CONFIG' as any,
        entityId: 'config-key',
        oldValue: { password: 'my-password', token: 'my-token', safeField: 'value' },
        newValue: { apiKey: 'my-api-key', secret: 'my-secret', safeField: 'new-value' },
        metadata: {},
        context: { ipAddress: '127.0.0.1', userAgent: 'test-agent' },
      });

      expect(auditLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          oldValue: { password: '[REDACTED]', token: '[REDACTED]', safeField: 'value' },
          newValue: { apiKey: '[REDACTED]', secret: '[REDACTED]', safeField: 'new-value' },
        }),
      );
    });

    it('should handle null/undefined values', async () => {
      const mockLog = {
        id: 'log-1',
        adminId: 'admin-1',
        action: 'PAYMENT_APPROVED',
        entityType: 'JOB',
        entityId: 'job-1',
        oldValue: null,
        newValue: { status: 'VERIFIED' },
        metadata: null,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        createdAt: new Date(),
      };

      auditLogRepo.create.mockReturnValue(mockLog as any);
      auditLogRepo.save.mockResolvedValue(mockLog as any);

      await service.log({
        adminId: 'admin-1',
        action: 'PAYMENT_APPROVED' as any,
        entityType: 'JOB' as any,
        entityId: 'job-1',
        oldValue: null,
        newValue: { status: 'VERIFIED' },
        metadata: null,
        context: { ipAddress: '127.0.0.1', userAgent: 'test-agent' },
      });

      expect(auditLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          oldValue: null,
          metadata: null,
        }),
      );
    });

    it('should handle missing context', async () => {
      const mockLog = {
        id: 'log-1',
        adminId: 'admin-1',
        action: 'PAYMENT_APPROVED',
        entityType: 'JOB',
        entityId: 'job-1',
        oldValue: { status: 'PENDING' },
        newValue: { status: 'VERIFIED' },
        metadata: {},
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      };

      auditLogRepo.create.mockReturnValue(mockLog as any);
      auditLogRepo.save.mockResolvedValue(mockLog as any);

      await service.log({
        adminId: 'admin-1',
        action: 'PAYMENT_APPROVED' as any,
        entityType: 'JOB' as any,
        entityId: 'job-1',
        oldValue: { status: 'PENDING' },
        newValue: { status: 'VERIFIED' },
        metadata: {},
      });

      expect(auditLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: null,
          userAgent: null,
        }),
      );
    });
  });
});
