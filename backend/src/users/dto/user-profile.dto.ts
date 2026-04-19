import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/role.enum';

export class UserProfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  phone: string;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Collector base latitude' })
  latitude: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Collector base longitude' })
  longitude: number | null;

  @ApiProperty({ description: 'Average rating (collectors only)' })
  avgRating: number;

  @ApiProperty({ description: 'Total completed jobs (collectors only)' })
  totalCompleted: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
