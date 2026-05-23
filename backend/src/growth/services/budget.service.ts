import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingBudgetPeriod, BudgetTransaction, BudgetTransactionType, BudgetPeriodStatus } from '../entities';
import { CreateBudgetPeriodDto, UpdateBudgetPeriodDto } from '../dto';

@Injectable()
export class BudgetService {
  constructor(
    @InjectRepository(MarketingBudgetPeriod)
    private readonly budgetPeriodRepo: Repository<MarketingBudgetPeriod>,
    @InjectRepository(BudgetTransaction)
    private readonly transactionRepo: Repository<BudgetTransaction>,
  ) {}

  async createBudgetPeriod(dto: CreateBudgetPeriodDto, createdBy: string): Promise<MarketingBudgetPeriod> {
    const period = this.budgetPeriodRepo.create({
      ...dto,
      createdBy,
      committedAmount: 0,
      spentAmount: 0,
    });
    return this.budgetPeriodRepo.save(period);
  }

  async findAllBudgetPeriods(page: number = 1, limit: number = 20): Promise<{ data: MarketingBudgetPeriod[]; total: number; totalPages: number }> {
    const [data, total] = await this.budgetPeriodRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, totalPages: Math.ceil(total / limit) };
  }

  async findBudgetPeriodById(id: string): Promise<MarketingBudgetPeriod> {
    const period = await this.budgetPeriodRepo.findOne({ where: { id } });
    if (!period) {
      throw new NotFoundException('Budget period not found');
    }
    return period;
  }

  async updateBudgetPeriod(id: string, dto: UpdateBudgetPeriodDto, updatedBy: string): Promise<MarketingBudgetPeriod> {
    const period = await this.findBudgetPeriodById(id);

    if (period.status !== BudgetPeriodStatus.ACTIVE) {
      throw new BadRequestException('Cannot update closed or cancelled budget period');
    }

    // Validate that new budget is not below already committed + spent
    if (dto.totalBudget !== undefined) {
      const newBudget = dto.totalBudget;
      const currentUsage = period.committedAmount + period.spentAmount;
      if (newBudget < currentUsage) {
        throw new BadRequestException(
          `Cannot reduce budget below already committed (${period.committedAmount}) + spent (${period.spentAmount})`,
        );
      }

      // Require adjustment reason when budget changes
      if (newBudget !== period.totalBudget && !dto.adjustmentReason) {
        throw new BadRequestException('Adjustment reason is required when changing the budget amount');
      }

      // Create adjustment transaction if budget changed
      if (newBudget !== period.totalBudget) {
        const difference = newBudget - period.totalBudget;
        await this.createBudgetTransaction({
          budgetPeriodId: period.id,
          campaignId: period.id, // Use period id as placeholder for overall budget
          type: BudgetTransactionType.ADJUSTMENT,
          amount: difference,
          balanceBefore: period.totalBudget,
          balanceAfter: newBudget,
          description: dto.adjustmentReason,
          createdBy: updatedBy,
        });
      }
    }

    Object.assign(period, dto);
    return this.budgetPeriodRepo.save(period);
  }

  async closeBudgetPeriod(id: string, closedBy: string): Promise<MarketingBudgetPeriod> {
    const period = await this.findBudgetPeriodById(id);
    period.status = BudgetPeriodStatus.CLOSED;
    return this.budgetPeriodRepo.save(period);
  }

  async getBudgetPeriodTransactions(id: string): Promise<BudgetTransaction[]> {
    return this.transactionRepo.find({
      where: { budgetPeriodId: id },
      relations: ['campaign', 'marketerProfile'],
      order: { createdAt: 'DESC' },
    });
  }

  async checkBudgetAvailability(budgetPeriodId: string, amount: number): Promise<boolean> {
    const period = await this.findBudgetPeriodById(budgetPeriodId);
    const remaining = period.totalBudget - period.committedAmount - period.spentAmount;
    return remaining >= amount;
  }

  async reserveBudget(
    budgetPeriodId: string,
    campaignId: string,
    amount: number,
    commissionTransactionId: string,
    marketerProfileId: string,
  ): Promise<void> {
    const period = await this.findBudgetPeriodById(budgetPeriodId);
    const balanceBefore = period.totalBudget - period.committedAmount - period.spentAmount;

    if (balanceBefore < amount) {
      throw new BadRequestException('Insufficient budget period balance');
    }

    period.committedAmount += amount;
    await this.budgetPeriodRepo.save(period);

    await this.createBudgetTransaction({
      budgetPeriodId,
      campaignId,
      commissionTransactionId,
      marketerProfileId,
      type: BudgetTransactionType.COMMITTED,
      amount,
      balanceBefore: period.committedAmount - amount,
      balanceAfter: period.committedAmount,
      description: 'Commission approved - budget reserved',
    });
  }

  async spendBudget(
    budgetPeriodId: string,
    campaignId: string,
    amount: number,
    commissionTransactionId: string,
    marketerProfileId: string,
  ): Promise<void> {
    const period = await this.findBudgetPeriodById(budgetPeriodId);
    
    period.committedAmount -= amount;
    period.spentAmount += amount;
    await this.budgetPeriodRepo.save(period);

    await this.createBudgetTransaction({
      budgetPeriodId,
      campaignId,
      commissionTransactionId,
      marketerProfileId,
      type: BudgetTransactionType.SPENT,
      amount,
      balanceBefore: period.spentAmount - amount,
      balanceAfter: period.spentAmount,
      description: 'Commission paid - budget spent',
    });
  }

  async releaseBudget(
    budgetPeriodId: string,
    campaignId: string,
    amount: number,
    commissionTransactionId: string,
    marketerProfileId: string,
  ): Promise<void> {
    const period = await this.findBudgetPeriodById(budgetPeriodId);
    
    period.committedAmount -= amount;
    await this.budgetPeriodRepo.save(period);

    await this.createBudgetTransaction({
      budgetPeriodId,
      campaignId,
      commissionTransactionId,
      marketerProfileId,
      type: BudgetTransactionType.RELEASED,
      amount,
      balanceBefore: period.committedAmount + amount,
      balanceAfter: period.committedAmount,
      description: 'Commission reversed - budget released',
    });
  }

  private async createBudgetTransaction(data: {
    budgetPeriodId: string;
    campaignId: string;
    commissionTransactionId?: string;
    marketerProfileId?: string;
    type: BudgetTransactionType;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description?: string;
    createdBy?: string;
  }): Promise<BudgetTransaction> {
    const transaction = this.transactionRepo.create(data);
    return this.transactionRepo.save(transaction);
  }
}
