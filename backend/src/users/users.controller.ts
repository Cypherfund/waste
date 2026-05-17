import { Controller, Get, Patch, Post, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { UsersService, CreateAddressDto } from './users.service';
import { UserProfileDto } from './dto/user-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserAddress } from './entities/user-address.entity';

class CreateAddressBody implements CreateAddressDto {
  @IsString()
  label: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  landmark?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile', type: UserProfileDto })
  async getProfile(@CurrentUser('sub') userId: string): Promise<UserProfileDto> {
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Updated profile', type: UserProfileDto })
  async updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get('addresses')
  @ApiOperation({ summary: 'List saved addresses for the current user' })
  async listAddresses(
    @CurrentUser('sub') userId: string,
  ): Promise<UserAddress[]> {
    return this.usersService.listAddresses(userId);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Save a new address' })
  async createAddress(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateAddressBody,
  ): Promise<UserAddress> {
    return this.usersService.createAddress(userId, dto);
  }

  @Delete('addresses/:id')
  @ApiOperation({ summary: 'Delete a saved address' })
  async deleteAddress(
    @CurrentUser('sub') userId: string,
    @Param('id') addressId: string,
  ): Promise<void> {
    return this.usersService.deleteAddress(userId, addressId);
  }

  @Patch('addresses/:id/default')
  @ApiOperation({ summary: 'Set an address as the default' })
  async setDefaultAddress(
    @CurrentUser('sub') userId: string,
    @Param('id') addressId: string,
  ): Promise<UserAddress> {
    return this.usersService.setDefaultAddress(userId, addressId);
  }
}
