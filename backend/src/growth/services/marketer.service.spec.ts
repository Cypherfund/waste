import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MarketerService } from './marketer.service';
import {
  MarketerProfile,
  MarketerStatus,
  CommissionScheme,
  MarketerSchemeAssignment,
} from '../entities';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../common/enums/role.enum';
import { SmsProvider } from '../../notifications/providers/sms.provider';
import { EmailProvider } from '../../notifications/providers/email.provider';

describe('MarketerService', () => {
  let service: MarketerService;
  let profileRepo: any;
  let userRepo: any;
  let schemeRepo: any;
  let assignmentRepo: any;

  const mockUser: Partial<User> = {
    id: 'user-1',
    name: 'Test Marketer',
    phone: '+237670000001',
    email: 'marketer@test.com',
    role: UserRole.MARKETER,
    isActive: true,
  };

  const mockProfile: Partial<MarketerProfile> = {
    id: 'profile-1',
    userId: 'user-1',
    referralCode: 'MKR-TEST-1234',
    territory: 'Douala',
    status: MarketerStatus.ACTIVE,
    totalLeads: 0,
    totalRegistered: 0,
    totalQualified: 0,
    totalExpired: 0,
    conversionRate: 0,
    qualificationRate: 0,
    totalEarned: 0,
    totalPaid: 0,
    pendingAmount: 0,
    approvedAmount: 0,
    dailyLeadsCreated: 0,
    user: mockUser as User,
  };

  beforeEach(async () => {
    const fullProfile = {
      id: 'profile-1',
      userId: 'user-1',
      referralCode: 'MKR-TEST-1234',
      territory: null,
      status: MarketerStatus.ACTIVE,
      totalLeads: 0,
      totalRegistered: 0,
      totalQualified: 0,
      totalExpired: 0,
      conversionRate: 0,
      qualificationRate: 0,
      totalEarned: 0,
      totalPaid: 0,
      pendingAmount: 0,
      approvedAmount: 0,
      dailyLeadsCreated: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: mockUser as User,
    };

    profileRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...fullProfile, ...dto })),
      save: jest.fn((entity) => Promise.resolve({ ...fullProfile, ...entity })),
    };

    userRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...mockUser, ...dto })),
      save: jest.fn((entity) => Promise.resolve({ ...mockUser, ...entity })),
      update: jest.fn(),
    };

    schemeRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    assignmentRepo = {
      save: jest.fn((entity) => Promise.resolve({ id: 'assign-1', ...entity })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketerService,
        { provide: getRepositoryToken(MarketerProfile), useValue: profileRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(CommissionScheme), useValue: schemeRepo },
        { provide: getRepositoryToken(MarketerSchemeAssignment), useValue: assignmentRepo },
        { provide: SmsProvider, useValue: {} },
        { provide: EmailProvider, useValue: {} },
      ],
    }).compile();

    service = module.get<MarketerService>(MarketerService);
  });

  describe('createMarketer', () => {
    it('should throw ConflictException if phone already exists', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);

      await expect(
        service.createMarketer(
          { name: 'New', phone: '+237670000001', password: 'Pass123!' },
          'admin-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if email already exists', async () => {
      userRepo.findOne
        .mockResolvedValueOnce(null)     // phone check → not found
        .mockResolvedValueOnce(mockUser); // email check → found

      await expect(
        service.createMarketer(
          { name: 'New', phone: '+237670000099', email: 'marketer@test.com', password: 'Pass123!' },
          'admin-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user with MARKETER role and an active profile', async () => {
      userRepo.findOne.mockResolvedValue(null); // no conflicts
      schemeRepo.find.mockResolvedValue([]);    // no auto-assigned schemes

      const result = await service.createMarketer(
        { name: 'Alice', phone: '+237670000002', password: 'Pass123!' },
        'admin-1',
      );

      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.MARKETER, isActive: true }),
      );
      expect(profileRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: MarketerStatus.ACTIVE }),
      );
      expect(result).toHaveProperty('id');
    });

    it('should auto-assign default active schemes to new marketer', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const defaultScheme = { id: 'scheme-1', isAutoAssigned: true, isActive: true };
      schemeRepo.find.mockResolvedValue([defaultScheme]);

      await service.createMarketer(
        { name: 'Bob', phone: '+237670000003', password: 'Pass123!' },
        'admin-1',
      );

      expect(assignmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ schemeId: 'scheme-1', isActive: true }),
      );
    });
  });

  describe('suspendMarketer', () => {
    it('should set profile status to SUSPENDED and deactivate user', async () => {
      profileRepo.findOne.mockResolvedValue({ ...mockProfile });

      await service.suspendMarketer('profile-1');

      expect(profileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: MarketerStatus.SUSPENDED }),
      );
      expect(userRepo.update).toHaveBeenCalledWith('user-1', { isActive: false });
    });

    it('should throw NotFoundException if marketer not found', async () => {
      profileRepo.findOne.mockResolvedValue(null);

      await expect(service.suspendMarketer('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('activateMarketer', () => {
    it('should set profile status to ACTIVE and re-enable user', async () => {
      profileRepo.findOne.mockResolvedValue({
        ...mockProfile,
        status: MarketerStatus.SUSPENDED,
      });

      await service.activateMarketer('profile-1');

      expect(profileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: MarketerStatus.ACTIVE }),
      );
      expect(userRepo.update).toHaveBeenCalledWith('user-1', { isActive: true });
    });

    it('should throw NotFoundException if marketer not found', async () => {
      profileRepo.findOne.mockResolvedValue(null);

      await expect(service.activateMarketer('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByUserId', () => {
    it('should throw NotFoundException if profile not found', async () => {
      profileRepo.findOne.mockResolvedValue(null);

      await expect(service.findByUserId('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return profile when found', async () => {
      profileRepo.findOne.mockResolvedValue(mockProfile);

      const result = await service.findByUserId('user-1');
      expect(result.id).toBe('profile-1');
    });
  });
});
