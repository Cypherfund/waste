import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketerProfile, MarketerStatus, CommissionScheme, MarketerSchemeAssignment } from '../entities';
import { CreateMarketerDto, MarketerResponseDto } from '../dto';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../common/enums/role.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class MarketerService {
  private readonly SALT_ROUNDS = 12;

  constructor(
    @InjectRepository(MarketerProfile)
    private readonly profileRepo: Repository<MarketerProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(CommissionScheme)
    private readonly schemeRepo: Repository<CommissionScheme>,
    @InjectRepository(MarketerSchemeAssignment)
    private readonly assignmentRepo: Repository<MarketerSchemeAssignment>,
  ) {}

  private generateReferralCode(name: string): string {
    const namePart = name.replace(/[^a-zA-Z]/g, '').substring(0, 5).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `MKR-${namePart}-${random}`;
  }

  async createMarketer(dto: CreateMarketerDto, createdBy: string): Promise<MarketerResponseDto> {
    // Check if phone already exists
    const existingUser = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });
    if (existingUser) {
      throw new ConflictException('Phone number already registered');
    }

    // Check if email exists (if provided)
    if (dto.email) {
      const existingEmail = await this.userRepo.findOne({
        where: { email: dto.email },
      });
      if (existingEmail) {
        throw new ConflictException('Email already registered');
      }
    }

    // Generate password if not provided
    const password = dto.password || this.generateTempPassword();
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Create user
    const user = this.userRepo.create({
      name: dto.name,
      phone: dto.phone,
      email: dto.email || null,
      passwordHash,
      role: UserRole.MARKETER,
      isActive: true,
    });
    const savedUser = await this.userRepo.save(user);

    // Create marketer profile
    const profile = this.profileRepo.create({
      userId: savedUser.id,
      referralCode: this.generateReferralCode(dto.name),
      territory: dto.territory || null,
      status: MarketerStatus.ACTIVE,
    });
    const savedProfile = await this.profileRepo.save(profile);

    // Assign default schemes
    await this.assignDefaultSchemes(savedProfile.id, createdBy);

    return this.toResponseDto(savedProfile, savedUser);
  }

  private async assignDefaultSchemes(profileId: string, assignedBy: string): Promise<void> {
    const defaultSchemes = await this.schemeRepo.find({
      where: { isAutoAssigned: true, isActive: true },
    });

    for (const scheme of defaultSchemes) {
      await this.assignmentRepo.save({
        marketerProfileId: profileId,
        schemeId: scheme.id,
        assignedBy,
        isActive: true,
      });
    }
  }

  private generateTempPassword(): string {
    return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
  }

  async findAll(): Promise<MarketerResponseDto[]> {
    const profiles = await this.profileRepo.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return profiles.map(p => this.toResponseDto(p, p.user));
  }

  async findById(id: string): Promise<MarketerResponseDto> {
    const profile = await this.profileRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!profile) {
      throw new NotFoundException('Marketer not found');
    }
    return this.toResponseDto(profile, profile.user);
  }

  async findByUserId(userId: string): Promise<MarketerProfile> {
    const profile = await this.profileRepo.findOne({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Marketer profile not found');
    }
    return profile;
  }

  async suspendMarketer(id: string): Promise<void> {
    const profile = await this.profileRepo.findOne({ where: { id } });
    if (!profile) {
      throw new NotFoundException('Marketer not found');
    }
    profile.status = MarketerStatus.SUSPENDED;
    await this.profileRepo.save(profile);

    // Also deactivate user
    await this.userRepo.update(profile.userId, { isActive: false });
  }

  async activateMarketer(id: string): Promise<void> {
    const profile = await this.profileRepo.findOne({ where: { id } });
    if (!profile) {
      throw new NotFoundException('Marketer not found');
    }
    profile.status = MarketerStatus.ACTIVE;
    await this.profileRepo.save(profile);

    // Also activate user
    await this.userRepo.update(profile.userId, { isActive: true });
  }

  private toResponseDto(profile: MarketerProfile, user: User): MarketerResponseDto {
    return {
      id: profile.id,
      userId: profile.userId,
      name: user.name,
      phone: user.phone,
      email: user.email,
      referralCode: profile.referralCode,
      territory: profile.territory,
      status: profile.status,
      totalLeads: profile.totalLeads,
      totalRegistered: profile.totalRegistered,
      totalQualified: profile.totalQualified,
      totalExpired: profile.totalExpired,
      conversionRate: parseFloat(profile.conversionRate.toString()),
      qualificationRate: parseFloat(profile.qualificationRate.toString()),
      totalEarned: parseFloat(profile.totalEarned.toString()),
      totalPaid: parseFloat(profile.totalPaid.toString()),
      pendingAmount: parseFloat(profile.pendingAmount.toString()),
      approvedAmount: parseFloat(profile.approvedAmount.toString()),
      dailyLeadsCreated: profile.dailyLeadsCreated,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
