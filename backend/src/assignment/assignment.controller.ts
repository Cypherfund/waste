import {
  Controller,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { AssignmentService } from './assignment.service';
import { ManualAssignDto } from './dto/manual-assign.dto';

@ApiTags('Assignment')
@ApiBearerAuth()
@Controller('jobs')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually assign a collector to a job (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Job assigned to collector' })
  @ApiResponse({ status: 400, description: 'Invalid job state' })
  @ApiResponse({ status: 404, description: 'Job or collector not found' })
  async manualAssign(
    @Param('id', ParseUUIDPipe) jobId: string,
    @Body() dto: ManualAssignDto,
  ): Promise<{ message: string }> {
    await this.assignmentService.manualAssign(jobId, dto.collectorId);
    return { message: 'Job assigned successfully' };
  }
}
