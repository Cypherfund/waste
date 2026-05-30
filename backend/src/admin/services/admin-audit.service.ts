import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLog, AdminAuditAction, AdminAuditEntityType } from '../entities/admin-audit-log.entity';

export interface AuditRequestContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogOptions {
  adminId: string;
  action: AdminAuditAction;
  entityType: AdminAuditEntityType;
  entityId?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  metadata?: Record<string, any>;
  context?: AuditRequestContext;
}

@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);
  private readonly sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'apiSecret',
    'privateKey',
    'credential',
    'auth',
  ];

  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly auditLogRepo: Repository<AdminAuditLog>,
  ) {}

  async log(options: AuditLogOptions): Promise<AdminAuditLog> {
    const {
      adminId,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
      metadata,
      context,
    } = options;

    // Sanitize sensitive data
    const sanitizedOldValue = this.sanitizeData(oldValue);
    const sanitizedNewValue = this.sanitizeData(newValue);
    const sanitizedMetadata = this.sanitizeData(metadata);

    const auditLog = this.auditLogRepo.create({
      adminId,
      action,
      entityType,
      entityId: entityId || null,
      oldValue: sanitizedOldValue,
      newValue: sanitizedNewValue,
      metadata: sanitizedMetadata,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
    });

    try {
      const saved = await this.auditLogRepo.save(auditLog);
      this.logger.debug(`Audit log created: ${action} on ${entityType} by ${adminId}`);
      return saved;
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`);
      // Don't throw - audit log failures should not break the main operation
      return auditLog;
    }
  }

  private sanitizeData(data: Record<string, any> | undefined): Record<string, any> | null {
    if (!data) return null;

    const sanitized = { ...data };

    for (const key of Object.keys(sanitized)) {
      if (this.sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }
}
