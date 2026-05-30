import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  StreamableFile,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBody } from '@nestjs/swagger';
import {
  ReconciliationService,
  ReconciliationMetrics,
  UnreconciledItem,
} from '../services/reconciliation.service';
import { ReconciliationSchedulerService } from '../services/reconciliation-scheduler.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('Admin - Reconciliation')
@Controller('admin/reconciliation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ReconciliationController {
  constructor(
    private readonly reconciliationService: ReconciliationService,
    private readonly reconciliationSchedulerService: ReconciliationSchedulerService,
  ) {}

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get reconciliation summary for a date range' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Reconciliation summary retrieved successfully' })
  async getSummary(
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const summaries = await this.reconciliationService.getSummaryRange(fromDate, toDate);
    return {
      success: true,
      data: summaries,
    };
  }

  @Get('daily')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate and return daily reconciliation metrics' })
  @ApiQuery({ name: 'date', required: true, description: 'Date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Daily reconciliation metrics calculated successfully' })
  async getDailyMetrics(@Query('date') date: string, @CurrentUser() user: JwtPayload) {
    const metrics = await this.reconciliationService.calculateDailySummary(date);
    return {
      success: true,
      data: metrics,
    };
  }

  @Get('unreconciled')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get unreconciled items for a date range' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Unreconciled items retrieved successfully' })
  async getUnreconciled(
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);

    const unreconciled = await this.reconciliationService.getUnreconciledItems(startDate, endDate);
    return {
      success: true,
      data: unreconciled,
    };
  }

  @Post('daily/save')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save daily reconciliation summary to database' })
  @ApiQuery({ name: 'date', required: true, description: 'Date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Daily reconciliation summary saved successfully' })
  async saveDailySummary(@Query('date') date: string, @CurrentUser() user: JwtPayload) {
    const summary = await this.reconciliationService.saveDailySummary(date);
    return {
      success: true,
      data: summary,
    };
  }

  @Get('export')
  @ApiOperation({ summary: 'Export reconciliation data as CSV' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'CSV file generated successfully' })
  async exportReconciliation(
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const csvBuffer = await this.reconciliationService.exportToCsv(fromDate, toDate);
    return new StreamableFile(csvBuffer, {
      type: 'text/csv',
      disposition: `attachment; filename="reconciliation_${fromDate}_to_${toDate}.csv"`,
    });
  }

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger reconciliation for a specific date' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date to reconcile (YYYY-MM-DD)',
          example: '2026-05-29',
        },
      },
      required: ['date'],
    },
  })
  @ApiResponse({ status: 200, description: 'Reconciliation triggered successfully' })
  async runReconciliation(
    @Body() body: { date: string },
    @CurrentUser() user: JwtPayload,
  ) {
    const run = await this.reconciliationSchedulerService.runForDate(
      body.date,
      'MANUAL' as any,
      user.userId,
    );
    return {
      success: true,
      data: run,
    };
  }
}
