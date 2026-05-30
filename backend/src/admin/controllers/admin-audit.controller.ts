import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AdminAuditService } from '../services/admin-audit.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLog, AdminAuditAction, AdminAuditEntityType } from '../entities/admin-audit-log.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Admin - Audit Logs')
@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAuditController {
  constructor(
    private readonly adminAuditService: AdminAuditService,
    @InjectRepository(AdminAuditLog)
    private readonly auditLogRepo: Repository<AdminAuditLog>,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get audit logs with filters' })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'adminId', required: false, description: 'Filter by admin ID' })
  @ApiQuery({ name: 'action', required: false, enum: AdminAuditAction, description: 'Filter by action' })
  @ApiQuery({ name: 'entityType', required: false, enum: AdminAuditEntityType, description: 'Filter by entity type' })
  @ApiQuery({ name: 'entityId', required: false, description: 'Filter by entity ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 50)' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  async getAuditLogs(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('adminId') adminId?: string,
    @Query('action') action?: AdminAuditAction,
    @Query('entityType') entityType?: AdminAuditEntityType,
    @Query('entityId') entityId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number = 50,
  ) {
    const queryBuilder = this.auditLogRepo.createQueryBuilder('audit');

    if (from) {
      queryBuilder.andWhere('audit.createdAt >= :from', { from: new Date(from) });
    }

    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('audit.createdAt <= :to', { to: toDate });
    }

    if (adminId) {
      queryBuilder.andWhere('audit.adminId = :adminId', { adminId });
    }

    if (action) {
      queryBuilder.andWhere('audit.action = :action', { action });
    }

    if (entityType) {
      queryBuilder.andWhere('audit.entityType = :entityType', { entityType });
    }

    if (entityId) {
      queryBuilder.andWhere('audit.entityId = :entityId', { entityId });
    }

    const [data, total] = await queryBuilder
      .orderBy('audit.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      success: true,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get audit log by ID' })
  @ApiResponse({ status: 200, description: 'Audit log retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  async getAuditLogById(@Param('id') id: string) {
    const auditLog = await this.auditLogRepo.findOne({
      where: { id },
    });

    if (!auditLog) {
      throw new NotFoundException('Audit log not found');
    }

    return {
      success: true,
      data: auditLog,
    };
  }
}
