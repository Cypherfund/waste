import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserProfileDto } from './dto/user-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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
  }): Promise<User[]> {
    const where: any = {};
    if (filters?.role) where.role = filters.role;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    return this.userRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async countByRole(role: string): Promise<number> {
    return this.userRepo.count({ where: { role: role as any } });
  }

  async countFlaggedCollectors(): Promise<number> {
    return this.userRepo.count({ where: { role: 'COLLECTOR' as any, isActive: false } });
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
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
