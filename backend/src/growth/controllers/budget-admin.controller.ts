import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { BudgetService } from '../services';
import { CreateBudgetPeriodDto, UpdateBudgetPeriodDto } from '../dto';

@ApiTags('Marketing Budget Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/marketing-budget-periods')
export class BudgetAdminController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  @ApiOperation({ summary: 'Create new budget period' })
  async create(@Body() dto: CreateBudgetPeriodDto, @Request() req: any) {
    return this.budgetService.createBudgetPeriod(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List all budget periods' })
  async findAll() {
    return this.budgetService.findAllBudgetPeriods();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get budget period by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.budgetService.findBudgetPeriodById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update budget period' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetPeriodDto,
    @Request() req: any,
  ) {
    return this.budgetService.updateBudgetPeriod(id, dto, req.user.sub);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close budget period' })
  async close(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.budgetService.closeBudgetPeriod(id, req.user.sub);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Get budget period transactions' })
  async getTransactions(@Param('id', ParseUUIDPipe) id: string) {
    return this.budgetService.getBudgetPeriodTransactions(id);
  }
}
