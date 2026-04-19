import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/role.enum';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  phone: string;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}

export class TokenResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}
