import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { CampaignService } from '../services';
import { CreateCampaignDto, UpdateCampaignDto, AssignMarketersDto, AssignSchemesDto } from '../dto';
import { CampaignStatus } from '../entities';

@ApiTags('Marketing Campaign Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/marketing-campaigns')
export class CampaignAdminController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @ApiOperation({ summary: 'Create new campaign' })
  async create(@Body() dto: CreateCampaignDto, @Request() req: any) {
    return this.campaignService.createCampaign(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List all campaigns' })
  async findAll(
    @Query('status') status?: CampaignStatus,
    @Query('territory') territory?: string,
    @Query('budgetPeriodId') budgetPeriodId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.campaignService.findAllCampaigns({ 
      status, 
      territory, 
      budgetPeriodId,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignService.findCampaignById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update campaign' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignService.updateCampaign(id, dto);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate campaign' })
  async activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignService.activateCampaign(id);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause campaign' })
  async pause(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignService.pauseCampaign(id);
  }

  @Post(':id/end')
  @ApiOperation({ summary: 'End campaign' })
  async end(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignService.endCampaign(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel campaign' })
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignService.cancelCampaign(id);
  }

  @Post(':id/assign-marketers')
  @ApiOperation({ summary: 'Assign marketers to campaign' })
  async assignMarketers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignMarketersDto,
    @Request() req: any,
  ) {
    return this.campaignService.assignMarketers(id, dto, req.user.sub);
  }

  @Delete(':id/assign-marketers/:marketerProfileId')
  @ApiOperation({ summary: 'Remove marketer assignment' })
  async removeMarketerAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('marketerProfileId', ParseUUIDPipe) marketerProfileId: string,
  ) {
    return this.campaignService.removeMarketerAssignment(id, marketerProfileId);
  }

  @Post(':id/assign-schemes')
  @ApiOperation({ summary: 'Assign commission schemes to campaign' })
  async assignSchemes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignSchemesDto,
  ) {
    return this.campaignService.assignSchemes(id, dto);
  }

  @Delete(':id/assign-schemes/:schemeId')
  @ApiOperation({ summary: 'Remove scheme assignment' })
  async removeSchemeAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('schemeId', ParseUUIDPipe) schemeId: string,
  ) {
    return this.campaignService.removeSchemeAssignment(id, schemeId);
  }

  @Get(':id/budget-transactions')
  @ApiOperation({ summary: 'Get campaign budget transactions' })
  async getBudgetTransactions(@Param('id', ParseUUIDPipe) id: string) {
    // This will be implemented later to get transactions filtered by campaign
    return { message: 'Not implemented yet' };
  }

  @Get(':id/performance')
  @ApiOperation({ summary: 'Get campaign performance stats' })
  async getPerformance(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignService.getCampaignPerformance(id);
  }
}
