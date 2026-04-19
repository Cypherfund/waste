import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsIn,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/role.enum';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '+237670000000', description: 'Cameroon phone number' })
  @IsString()
  @Matches(/^\+237[0-9]{9}$/, {
    message: 'Phone must be a valid Cameroon number: +237XXXXXXXXX',
  })
  phone: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'SecurePass123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @ApiProperty({ enum: ['HOUSEHOLD', 'COLLECTOR'], example: 'HOUSEHOLD' })
  @IsEnum(UserRole)
  @IsIn([UserRole.HOUSEHOLD, UserRole.COLLECTOR], {
    message: 'Role must be HOUSEHOLD or COLLECTOR',
  })
  role: UserRole;
}
