import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { LeadService } from './lead.service';
import { SMSService } from './sms.service';
import { MarketerNotificationService } from './marketer-notification.service';
import { Lead, LeadStatus, MarketerProfile } from '../entities';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('LeadService', () => {
  let service: LeadService;
  let leadRepo: any;
  let profileRepo: any;
  let smsService: any;
  let notificationService: any;
  let dataSource: any;

  beforeEach(async () => {
    leadRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'lead-1', ...entity })),
      update: jest.fn(),
    };

    profileRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    smsService = {
      send: jest.fn().mockResolvedValue({ messageId: 'msg-1' }),
    };

    notificationService = {
      sendNotification: jest.fn(),
    };

    dataSource = {
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadService,
        { provide: getRepositoryToken(Lead), useValue: leadRepo },
        { provide: getRepositoryToken(MarketerProfile), useValue: profileRepo },
        { provide: SMSService, useValue: smsService },
        { provide: MarketerNotificationService, useValue: notificationService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<LeadService>(LeadService);
  });

  describe('claimReferralToken', () => {
    it('should reject if token not found', async () => {
      leadRepo.findOne.mockResolvedValue(null);

      await expect(service.claimReferralToken('bad-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject if lead already claimed (REGISTERED)', async () => {
      leadRepo.findOne.mockResolvedValue({
        id: 'lead-1',
        status: LeadStatus.REGISTERED,
        expiresAt: new Date(Date.now() + 86400000),
      });

      await expect(service.claimReferralToken('token-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject if token expired', async () => {
      leadRepo.findOne.mockResolvedValue({
        id: 'lead-1',
        status: LeadStatus.INVITED,
        expiresAt: new Date(Date.now() - 86400000), // expired yesterday
      });

      await expect(service.claimReferralToken('token-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return lead if token valid and not expired', async () => {
      const mockLead = {
        id: 'lead-1',
        status: LeadStatus.INVITED,
        expiresAt: new Date(Date.now() + 86400000),
      };
      leadRepo.findOne.mockResolvedValue(mockLead);

      const result = await service.claimReferralToken('token-1');
      expect(result).toEqual(mockLead);
    });
  });

  describe('resendInvite - status guard', () => {
    it('should reject resend for REGISTERED leads', async () => {
      leadRepo.findOne.mockResolvedValue({
        id: 'lead-1',
        marketerId: 'marketer-1',
        status: LeadStatus.REGISTERED,
      });

      await expect(
        service.resendInvite('lead-1', 'marketer-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject resend for QUALIFIED leads', async () => {
      leadRepo.findOne.mockResolvedValue({
        id: 'lead-1',
        marketerId: 'marketer-1',
        status: LeadStatus.QUALIFIED,
      });

      await expect(
        service.resendInvite('lead-1', 'marketer-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('expireLead', () => {
    it('should reject expiring a QUALIFIED lead', async () => {
      leadRepo.findOne.mockResolvedValue({
        id: 'lead-1',
        status: LeadStatus.QUALIFIED,
      });

      await expect(service.expireLead('lead-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should expire an INVITED lead and increment totalExpired', async () => {
      leadRepo.findOne.mockResolvedValue({
        id: 'lead-1',
        status: LeadStatus.INVITED,
        marketerId: 'marketer-1',
      });
      profileRepo.findOne.mockResolvedValue({
        userId: 'marketer-1',
        totalExpired: 2,
      });

      await service.expireLead('lead-1');

      expect(leadRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: LeadStatus.EXPIRED }),
      );
      expect(profileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ totalExpired: 3 }),
      );
    });
  });
});
