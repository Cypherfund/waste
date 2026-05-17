import { IsString, IsOptional, IsPhoneNumber, IsEmail, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMarketerDto {
  @ApiProperty({ example: 'John Marketer' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '+237670000000' })
  @IsPhoneNumber()
  phone: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: 'Douala' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  territory?: string;

  @ApiPropertyOptional({ example: 'password123', description: 'Initial password (will be hashed)' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
