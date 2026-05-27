import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { UserAddress } from './entities/user-address.entity';
import { UserProfileDto } from './dto/user-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

export interface CreateAddressDto {
  label: string;
  address: string;
  landmark?: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserAddress)
    private readonly addressRepo: Repository<UserAddress>,
    private readonly dataSource: DataSource,
  ) {}

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toProfileDto(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfileDto> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Only update provided fields
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    if (dto.latitude !== undefined) user.latitude = dto.latitude;
    if (dto.longitude !== undefined) user.longitude = dto.longitude;

    const updated = await this.userRepo.save(user);
    return this.toProfileDto(updated);
  }

  async findById(userId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id: userId } });
  }

  async findByRole(role: string): Promise<User[]> {
    return this.userRepo.find({ where: { role: role as any, isActive: true } });
  }

  async updateFcmToken(userId: string, fcmToken: string): Promise<void> {
    await this.userRepo.update({ id: userId }, { fcmToken });
  }

  async findAllWithFcmToken(): Promise<User[]> {
    return this.userRepo
      .createQueryBuilder('user')
      .where('user.fcm_token IS NOT NULL')
      .andWhere("user.fcm_token != ''")
      .andWhere('user.is_active = true')
      .select(['user.id', 'user.fcmToken'])
      .getMany();
  }

  async deactivateUser(userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.isActive = false;
    await this.userRepo.save(user);
  }

  async activateUser(userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.isActive = true;
    await this.userRepo.save(user);
  }

  async listUsers(filters?: {
    role?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: User[]; total: number }> {
    const where: any = {};
    if (filters?.role) where.role = filters.role;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;

    const [data, total] = await this.userRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async countByRole(role: string): Promise<number> {
    return this.userRepo.count({ where: { role: role as any } });
  }

  async countFlaggedCollectors(): Promise<number> {
    return this.userRepo.count({ where: { role: 'COLLECTOR' as any, isActive: false } });
  }

  // ── ADDRESS CRUD ──────────────────────────────────────────────

  async listAddresses(userId: string): Promise<UserAddress[]> {
    return this.addressRepo.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
  }

  async createAddress(userId: string, dto: CreateAddressDto): Promise<UserAddress> {
    return this.dataSource.transaction(async (em) => {
      if (dto.isDefault) {
        await em.getRepository(UserAddress).update({ userId }, { isDefault: false });
      }
      const address = em.getRepository(UserAddress).create({
        userId,
        label: dto.label,
        address: dto.address,
        landmark: dto.landmark ?? null,
        lat: dto.lat ?? null,
        lng: dto.lng ?? null,
        isDefault: dto.isDefault ?? false,
      });
      return em.getRepository(UserAddress).save(address);
    });
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const address = await this.addressRepo.findOne({ where: { id: addressId, userId } });
    if (!address) throw new NotFoundException('Address not found');
    await this.addressRepo.remove(address);
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<UserAddress> {
    return this.dataSource.transaction(async (em) => {
      const address = await em
        .getRepository(UserAddress)
        .findOne({ where: { id: addressId, userId } });
      if (!address) throw new NotFoundException('Address not found');
      await em.getRepository(UserAddress).update({ userId }, { isDefault: false });
      address.isDefault = true;
      return em.getRepository(UserAddress).save(address);
    });
  }

  private toProfileDto(user: User): UserProfileDto {
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      avatarUrl: user.avatarUrl,
      latitude: user.latitude,
      longitude: user.longitude,
      avgRating: user.avgRating,
      totalCompleted: user.totalCompleted,
      countryCode: user.countryCode,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
