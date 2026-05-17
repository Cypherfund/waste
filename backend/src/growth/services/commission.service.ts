import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CommissionScheme, CommissionTransaction, CommissionStatus, MarketerProfile, MarketerSchemeAssignment } from '../entities';
import { CreateSchemeDto, ApproveCommissionDto, RejectCommissionDto } from '../dto';

@Injectable()
export class CommissionService {
  constructor(
    @InjectRepository(CommissionScheme)
    private readonly schemeRepo: Repository<CommissionScheme>,
    @InjectRepository(CommissionTransaction)
    private readonly transactionRepo: Repository<CommissionTransaction>,
    @InjectRepository(MarketerProfile)
    private readonly profileRepo: Repository<MarketerProfile>,
    @InjectRepository(MarketerSchemeAssignment)
    private readonly assignmentRepo: Repository<MarketerSchemeAssignment>,
  ) {}

  // Scheme Management
  async createScheme(dto: CreateSchemeDto): Promise<CommissionScheme> {
    const scheme = this.schemeRepo.create(dto);
    return this.schemeRepo.save(scheme);
  }

  async findAllSchemes(): Promise<CommissionScheme[]> {
    return this.schemeRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveSchemes(): Promise<CommissionScheme[]> {
    return this.schemeRepo.find({
      where: { isActive: true },
    });
  }

  async updateScheme(id: string, dto: Partial<CreateSchemeDto>): Promise<CommissionScheme> {
    const scheme = await this.schemeRepo.findOne({ where: { id } });
    if (!scheme) {
      throw new NotFoundException('Scheme not found');
    }
    Object.assign(scheme, dto);
    return this.schemeRepo.save(scheme);
  }

  async deactivateScheme(id: string): Promise<void> {
    await this.schemeRepo.update(id, { isActive: false });
  }

  // Transaction Management
  async findTransactions(filters: {
    marketerProfileId?: string;
    status?: CommissionStatus;
    page?: number;
    limit?: number;
  }): Promise<{ data: CommissionTransaction[]; total: number }> {
    const { marketerProfileId, status, page = 1, limit = 20 } = filters;
    const where: any = {};
    
    if (marketerProfileId) where.marketerProfileId = marketerProfileId;
    if (status) where.status = status;

    const [data, total] = await this.transactionRepo.findAndCount({
      where,
      relations: ['scheme', 'lead'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async approveTransaction(
    transactionId: string,
    adminId: string,
    dto?: ApproveCommissionDto,
  ): Promise<CommissionTransaction> {
    const transaction = await this.transactionRepo.findOne({
      where: { id: transactionId },
      relations: ['marketerProfile'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== CommissionStatus.PENDING) {
      throw new BadRequestException('Transaction is not pending');
    }

    transaction.status = CommissionStatus.APPROVED;
    transaction.reviewedAt = new Date();
    transaction.reviewedBy = adminId;
    
    if (dto?.note) {
      transaction.description = dto.note;
    }

    const saved = await this.transactionRepo.save(transaction);

    // Update marketer stats
    const profile = transaction.marketerProfile;
    const amt = parseFloat(transaction.amount.toString());
    profile.pendingAmount -= amt;
    profile.approvedAmount += amt;
    profile.totalEarned += amt;
    await this.profileRepo.save(profile);

    return saved;
  }

  async rejectTransaction(
    transactionId: string,
    adminId: string,
    dto: RejectCommissionDto,
  ): Promise<CommissionTransaction> {
    const transaction = await this.transactionRepo.findOne({
      where: { id: transactionId },
      relations: ['marketerProfile'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== CommissionStatus.PENDING) {
      throw new BadRequestException('Transaction is not pending');
    }

    transaction.status = CommissionStatus.REJECTED;
    transaction.rejectionReason = dto.reason;
    transaction.reviewedAt = new Date();
    transaction.reviewedBy = adminId;

    const saved = await this.transactionRepo.save(transaction);

    // Update marketer stats
    const profile = transaction.marketerProfile;
    profile.pendingAmount -= parseFloat(transaction.amount.toString());
    await this.profileRepo.save(profile);

    return saved;
  }

  async getMarketerCommissions(marketerProfileId: string): Promise<{
    pending: CommissionTransaction[];
    approved: CommissionTransaction[];
    paid: CommissionTransaction[];
  }> {
    const [pending, approved, paid] = await Promise.all([
      this.transactionRepo.find({
        where: { marketerProfileId, status: CommissionStatus.PENDING },
        relations: ['scheme', 'lead'],
        order: { createdAt: 'DESC' },
      }),
      this.transactionRepo.find({
        where: { marketerProfileId, status: CommissionStatus.APPROVED },
        relations: ['scheme', 'lead'],
        order: { createdAt: 'DESC' },
      }),
      this.transactionRepo.find({
        where: { marketerProfileId, status: CommissionStatus.PAID },
        relations: ['scheme', 'lead'],
        order: { createdAt: 'DESC' },
      }),
    ]);

    return { pending, approved, paid };
  }

  // Scheme Assignment
  async assignScheme(
    marketerProfileId: string,
    schemeId: string,
    assignedBy: string,
  ): Promise<MarketerSchemeAssignment> {
    const existing = await this.assignmentRepo.findOne({
      where: { marketerProfileId, schemeId },
    });

    if (existing) {
      existing.isActive = true;
      return this.assignmentRepo.save(existing);
    }

    const assignment = this.assignmentRepo.create({
      marketerProfileId,
      schemeId,
      assignedBy,
      isActive: true,
    });

    return this.assignmentRepo.save(assignment);
  }

  async removeSchemeAssignment(marketerProfileId: string, schemeId: string): Promise<void> {
    await this.assignmentRepo.update(
      { marketerProfileId, schemeId },
      { isActive: false },
    );
  }

  async getMarketerSchemes(marketerProfileId: string): Promise<CommissionScheme[]> {
    const assignments = await this.assignmentRepo.find({
      where: { marketerProfileId, isActive: true },
      relations: ['scheme'],
    });

    return assignments.map(a => a.scheme);
  }

  // Get eligible schemes for a trigger type
  async getEligibleSchemes(
    marketerProfileId: string,
    type: string,
  ): Promise<CommissionScheme[]> {
    const assignments = await this.assignmentRepo.find({
      where: { 
        marketerProfileId, 
        isActive: true,
      },
      relations: ['scheme'],
    });

    return assignments
      .map(a => a.scheme)
      .filter(s => s.type === type && s.isActive);
  }
}
