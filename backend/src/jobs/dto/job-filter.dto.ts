import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus } from '../../common/enums/job-status.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class JobFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: JobStatus })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}
