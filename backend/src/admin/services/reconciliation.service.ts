import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Between } from 'typeorm';
import { ReconciliationSummary } from '../entities/reconciliation-summary.entity';
import {
  TransactionStatus,
  TransactionType,
} from '../../payments/entities/payment-transaction.entity';
import { FloatLedgerType } from '../../wallet/entities/collector-float-ledger.entity';
import { EarningStatus } from '../../common/enums/earning-status.enum';
import { JobStatus } from '../../common/enums/job-status.enum';

export interface ReconciliationMetrics {
  summaryDate: string;
  moneyIn: {
    integratedProviderPayments: number;
    manualProviderPayments: number;
    walletTopups: number;
    cashCollected: number;
  };
  moneyOut: {
    collectorEarnings: number;
    marketerCommissions: number;
    approvedPayouts: number;
    walletBalanceLiabilities: number;
  };
  internalMovements: {
    walletDebits: number;
    collectorFloatDeductions: number;
    platformShareCashJobs: number;
    platformShareCashFirstPickup: number;
  };
  pendingRisk: {
    manualPaymentsPending: number;
    manualPaymentsPendingAmount: number;
    failedProviderPayments: number;
    failedProviderPaymentsAmount: number;
    unreconciledItems: number;
  };
}

export interface UnreconciledItem {
  type: string;
  description: string;
  amount: number;
  entityId: string;
  entityType: string;
  date: Date;
  reason: string;
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async calculateDailySummary(date: string): Promise<ReconciliationMetrics> {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const [
      integratedProviderPayments,
      manualProviderPayments,
      walletTopups,
      cashCollected,
      collectorEarnings,
      marketerCommissions,
      approvedPayouts,
      walletBalanceLiabilities,
      walletDebits,
      collectorFloatDeductions,
      platformShareCashJobs,
      platformShareCashFirstPickup,
      manualPaymentsPending,
      manualPaymentsPendingAmount,
      failedProviderPayments,
      failedProviderPaymentsAmount,
    ] = await Promise.all([
      this.getIntegratedProviderPayments(startDate, endDate),
      this.getManualProviderPayments(startDate, endDate),
      this.getWalletTopups(startDate, endDate),
      this.getCashCollected(startDate, endDate),
      this.getCollectorEarnings(startDate, endDate),
      this.getMarketerCommissions(startDate, endDate),
      this.getApprovedPayouts(startDate, endDate),
      this.getWalletBalanceLiabilities(),
      this.getWalletDebits(startDate, endDate),
      this.getCollectorFloatDeductions(startDate, endDate),
      this.getPlatformShareCashJobs(startDate, endDate),
      this.getPlatformShareCashFirstPickup(startDate, endDate),
      this.getManualPaymentsPending(startDate, endDate),
      this.getManualPaymentsPendingAmount(startDate, endDate),
      this.getFailedProviderPayments(startDate, endDate),
      this.getFailedProviderPaymentsAmount(startDate, endDate),
    ]);

    const unreconciledItems = await this.getUnreconciledItems(startDate, endDate);

    return {
      summaryDate: date,
      moneyIn: {
        integratedProviderPayments,
        manualProviderPayments,
        walletTopups,
        cashCollected,
      },
      moneyOut: {
        collectorEarnings,
        marketerCommissions,
        approvedPayouts,
        walletBalanceLiabilities,
      },
      internalMovements: {
        walletDebits,
        collectorFloatDeductions,
        platformShareCashJobs,
        platformShareCashFirstPickup,
      },
      pendingRisk: {
        manualPaymentsPending,
        manualPaymentsPendingAmount,
        failedProviderPayments,
        failedProviderPaymentsAmount,
        unreconciledItems: unreconciledItems.length,
      },
    };
  }

  async saveDailySummary(date: string): Promise<ReconciliationSummary> {
    const metrics = await this.calculateDailySummary(date);
    const repo = this.dataSource.getRepository(ReconciliationSummary);

    // Check if summary already exists for this date
    const existing = await repo.findOne({ where: { summaryDate: date } });

    if (existing) {
      // Update existing summary
      existing.integratedProviderPayments = metrics.moneyIn.integratedProviderPayments;
      existing.manualProviderPayments = metrics.moneyIn.manualProviderPayments;
      existing.walletTopups = metrics.moneyIn.walletTopups;
      existing.cashCollected = metrics.moneyIn.cashCollected;
      existing.collectorEarnings = metrics.moneyOut.collectorEarnings;
      existing.marketerCommissions = metrics.moneyOut.marketerCommissions;
      existing.approvedPayouts = metrics.moneyOut.approvedPayouts;
      existing.walletBalanceLiabilities = metrics.moneyOut.walletBalanceLiabilities;
      existing.walletDebits = metrics.internalMovements.walletDebits;
      existing.collectorFloatDeductions = metrics.internalMovements.collectorFloatDeductions;
      existing.platformShareCashJobs = metrics.internalMovements.platformShareCashJobs;
      existing.platformShareCashFirstPickup =
        metrics.internalMovements.platformShareCashFirstPickup;
      existing.manualPaymentsPending = metrics.pendingRisk.manualPaymentsPending;
      existing.manualPaymentsPendingAmount = metrics.pendingRisk.manualPaymentsPendingAmount;
      existing.failedProviderPayments = metrics.pendingRisk.failedProviderPayments;
      existing.failedProviderPaymentsAmount = metrics.pendingRisk.failedProviderPaymentsAmount;
      existing.unreconciledItems = metrics.pendingRisk.unreconciledItems;

      return await repo.save(existing);
    } else {
      // Create new summary
      const summary = repo.create({
        summaryDate: date,
        integratedProviderPayments: metrics.moneyIn.integratedProviderPayments,
        manualProviderPayments: metrics.moneyIn.manualProviderPayments,
        walletTopups: metrics.moneyIn.walletTopups,
        cashCollected: metrics.moneyIn.cashCollected,
        collectorEarnings: metrics.moneyOut.collectorEarnings,
        marketerCommissions: metrics.moneyOut.marketerCommissions,
        approvedPayouts: metrics.moneyOut.approvedPayouts,
        walletBalanceLiabilities: metrics.moneyOut.walletBalanceLiabilities,
        walletDebits: metrics.internalMovements.walletDebits,
        collectorFloatDeductions: metrics.internalMovements.collectorFloatDeductions,
        platformShareCashJobs: metrics.internalMovements.platformShareCashJobs,
        platformShareCashFirstPickup: metrics.internalMovements.platformShareCashFirstPickup,
        manualPaymentsPending: metrics.pendingRisk.manualPaymentsPending,
        manualPaymentsPendingAmount: metrics.pendingRisk.manualPaymentsPendingAmount,
        failedProviderPayments: metrics.pendingRisk.failedProviderPayments,
        failedProviderPaymentsAmount: metrics.pendingRisk.failedProviderPaymentsAmount,
        unreconciledItems: metrics.pendingRisk.unreconciledItems,
      });

      return await repo.save(summary);
    }
  }

  async getSummaryRange(fromDate: string, toDate: string): Promise<ReconciliationSummary[]> {
    const repo = this.dataSource.getRepository(ReconciliationSummary);
    return await repo.find({
      where: {
        summaryDate: Between(fromDate, toDate),
      },
      order: { summaryDate: 'ASC' },
    });
  }

  async getUnreconciledItems(fromDate: Date, toDate: Date): Promise<UnreconciledItem[]> {
    const unreconciled: UnreconciledItem[] = [];

    // 1. Provider payments verified but wallet not credited
    const verifiedPaymentsNoLedger = await this.dataSource.query(
      `
      SELECT pt.id, pt.user_id, pt.amount, pt.created_at
      FROM payment_transactions pt
      WHERE pt.type = 'WALLET_TOPUP'
      AND pt.status IN ('SUCCESS', 'VERIFIED')
      AND pt.created_at >= $1 AND pt.created_at <= $2
      AND NOT EXISTS (
        SELECT 1 FROM wallet_ledger wl
        WHERE wl.payment_transaction_id = pt.id
      )
    `,
      [fromDate, toDate],
    );

    for (const item of verifiedPaymentsNoLedger) {
      unreconciled.push({
        type: 'PAYMENT_VERIFIED_NO_LEDGER',
        description: 'Payment verified but no wallet ledger entry',
        amount: Number(item.amount),
        entityId: item.id,
        entityType: 'payment_transaction',
        date: item.created_at,
        reason: 'Wallet top-up verified but wallet ledger entry missing',
      });
    }

    // 2. Jobs completed with cash but no float deduction
    const cashJobsNoFloat = await this.dataSource.query(
      `
      SELECT j.id, j.cash_to_collect_amount, j.completed_at
      FROM jobs j
      WHERE j.status = 'COMPLETED'
      AND j.payment_mode = 'CASH'
      AND j.completed_at >= $1 AND j.completed_at <= $2
      AND NOT EXISTS (
        SELECT 1 FROM collector_float_ledger cfl
        WHERE cfl.job_id = j.id
        AND cfl.type = 'CASH_SETTLEMENT_DEDUCTION'
      )
    `,
      [fromDate, toDate],
    );

    for (const item of cashJobsNoFloat) {
      unreconciled.push({
        type: 'CASH_JOB_NO_FLOAT_DEDUCTION',
        description: 'Cash job completed but no float deduction',
        amount: Number(item.cash_to_collect_amount),
        entityId: item.id,
        entityType: 'job',
        date: item.completed_at,
        reason: 'Cash job completed but collector float not deducted',
      });
    }

    // 3. Possible duplicate wallet credits (same payment_transaction_id)
    const duplicateCredits = await this.dataSource.query(
      `
      SELECT
        wl.payment_transaction_id,
        wl.user_id,
        MIN(wl.amount) as amount,
        MIN(wl.created_at) as created_at,
        COUNT(*) as count
      FROM wallet_ledger wl
      WHERE wl.direction = 'CREDIT'
      AND wl.type = 'WALLET_TOPUP'
      AND wl.payment_transaction_id IS NOT NULL
      AND wl.created_at >= $1 AND wl.created_at <= $2
      GROUP BY wl.payment_transaction_id, wl.user_id
      HAVING COUNT(*) > 1
    `,
      [fromDate, toDate],
    );

    for (const item of duplicateCredits) {
      unreconciled.push({
        type: 'POSSIBLE_DUPLICATE_WALLET_CREDITS',
        description: 'Possible duplicate wallet credit (same payment transaction)',
        amount: Number(item.amount),
        entityId: item.payment_transaction_id,
        entityType: 'payment_transaction',
        date: item.created_at,
        reason: `Payment transaction ${item.payment_transaction_id} appears ${item.count} times in wallet ledger`,
      });
    }

    return unreconciled;
  }

  // Private helper methods for calculations

  private async getIntegratedProviderPayments(fromDate: Date, toDate: Date): Promise<number> {
    const result = await this.dataSource.query(
      `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payment_transactions
      WHERE type = 'WALLET_TOPUP'
      AND status = 'SUCCESS'
      AND created_at >= $1 AND created_at <= $2
    `,
      [fromDate, toDate],
    );
    return Number(result[0].total);
  }

  private async getManualProviderPayments(fromDate: Date, toDate: Date): Promise<number> {
    const result = await this.dataSource.query(
      `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payment_transactions
      WHERE type IN ('JOB_PAYMENT', 'SUBSCRIPTION_PAYMENT')
      AND status = 'VERIFIED'
      AND created_at >= $1 AND created_at <= $2
    `,
      [fromDate, toDate],
    );
    return Number(result[0].total);
  }

  private async getWalletTopups(fromDate: Date, toDate: Date): Promise<number> {
    const result = await this.dataSource.query(
      `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payment_transactions
      WHERE type = 'WALLET_TOPUP'
      AND status IN ('SUCCESS', 'VERIFIED')
      AND created_at >= $1 AND created_at <= $2
    `,
      [fromDate, toDate],
    );
    return Number(result[0].total);
  }

  private async getCashCollected(fromDate: Date, toDate: Date): Promise<number> {
    const result = await this.dataSource.query(
      `
      SELECT COALESCE(SUM(cash_to_collect_amount), 0) as total
      FROM jobs
      WHERE status = 'COMPLETED'
      AND payment_mode IN ('CASH', 'CASH_ON_FIRST_PICKUP')
      AND completed_at >= $1 AND completed_at <= $2
    `,
      [fromDate, toDate],
    );
    return Number(result[0].total);
  }

  private async getCollectorEarnings(fromDate: Date, toDate: Date): Promise<number> {
    const result = await this.dataSource.query(
      `
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM earnings
      WHERE status = 'CONFIRMED'
      AND confirmed_at >= $1 AND confirmed_at <= $2
    `,
      [fromDate, toDate],
    );
    return Number(result[0].total);
  }

  private async getMarketerCommissions(fromDate: Date, toDate: Date): Promise<number> {
    const result = await this.dataSource.query(
      `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM commission_transactions
      WHERE status = 'PAID'
      AND paid_at >= $1 AND paid_at <= $2
    `,
      [fromDate, toDate],
    );
    return Number(result[0].total);
  }

  private async getApprovedPayouts(fromDate: Date, toDate: Date): Promise<number> {
    const result = await this.dataSource.query(
      `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payout_requests
      WHERE status = 'APPROVED'
      AND reviewed_at >= $1 AND reviewed_at <= $2
    `,
      [fromDate, toDate],
    );
    return Number(result[0].total);
  }

  private async getWalletBalanceLiabilities(): Promise<number> {
    const result = await this.dataSource.query(`
      SELECT COALESCE(SUM(wallet_balance), 0) as total
      FROM users
      WHERE role IN ('HOUSEHOLD', 'COLLECTOR', 'MARKETER')
    `);
    return Number(result[0].total);
  }

  private async getWalletDebits(fromDate: Date, toDate: Date): Promise<number> {
    // Sum all debit transactions from wallet_ledger
    const result = await this.dataSource.query(
      `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM wallet_ledger
      WHERE direction = 'DEBIT'
      AND created_at >= $1 AND created_at <= $2
    `,
      [fromDate, toDate],
    );
    return Number(result[0].total);
  }

  private async getCollectorFloatDeductions(fromDate: Date, toDate: Date): Promise<number> {
    const result = await this.dataSource.query(
      `
      SELECT COALESCE(SUM(ABS(amount)), 0) as total
      FROM collector_float_ledger
      WHERE type = 'CASH_SETTLEMENT_DEDUCTION'
      AND created_at >= $1 AND created_at <= $2
    `,
      [fromDate, toDate],
    );
    return Number(result[0].total);
  }

  private async getPlatformShareCashJobs(fromDate: Date, toDate: Date): Promise<number> {
    // Platform share from normal cash jobs (CASH_SETTLEMENT_DEDUCTION)
    const result = await this.dataSource.query(
      `
      SELECT COALESCE(SUM(ABS(amount)), 0) as total
      FROM collector_float_ledger
      WHERE type = 'CASH_SETTLEMENT_DEDUCTION'
      AND created_at >= $1 AND created_at <= $2
    `,
      [fromDate, toDate],
    );
    return Number(result[0].total);
  }

  private async getPlatformShareCashFirstPickup(fromDate: Date, toDate: Date): Promise<number> {
    // Platform share from cash-on-first-pickup (CASH_SUBSCRIPTION_PLATFORM_SHARE)
    // Use actual ledger values, not estimated percentage
    const result = await this.dataSource.query(
      `
      SELECT COALESCE(SUM(ABS(amount)), 0) as total
      FROM collector_float_ledger
      WHERE type = 'CASH_SUBSCRIPTION_PLATFORM_SHARE'
      AND created_at >= $1 AND created_at <= $2
    `,
      [fromDate, toDate],
    );
    return Number(result[0].total);
  }

  private async getManualPaymentsPending(fromDate: Date, toDate: Date): Promise<number> {
    const result = await this.dataSource.query(
      `
      SELECT COUNT(*) as count
      FROM payment_transactions
      WHERE type IN ('JOB_PAYMENT', 'SUBSCRIPTION_PAYMENT')
      AND status = 'PENDING'
      AND created_at >= $1 AND created_at <= $2
    `,
      [fromDate, toDate],
    );
    return Number(result[0].count);
  }

  private async getManualPaymentsPendingAmount(fromDate: Date, toDate: Date): Promise<number> {
    const result = await this.dataSource.query(
      `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payment_transactions
      WHERE type IN ('JOB_PAYMENT', 'SUBSCRIPTION_PAYMENT')
      AND status = 'PENDING'
      AND created_at >= $1 AND created_at <= $2
    `,
      [fromDate, toDate],
    );
    return Number(result[0].total);
  }

  private async getFailedProviderPayments(fromDate: Date, toDate: Date): Promise<number> {
    const result = await this.dataSource.query(
      `
      SELECT COUNT(*) as count
      FROM payment_transactions
      WHERE status = 'FAILED'
      AND created_at >= $1 AND created_at <= $2
    `,
      [fromDate, toDate],
    );
    return Number(result[0].count);
  }

  private async getFailedProviderPaymentsAmount(fromDate: Date, toDate: Date): Promise<number> {
    const result = await this.dataSource.query(
      `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payment_transactions
      WHERE status = 'FAILED'
      AND created_at >= $1 AND created_at <= $2
    `,
      [fromDate, toDate],
    );
    return Number(result[0].total);
  }

  async exportToCsv(fromDate: string, toDate: string): Promise<Buffer> {
    const summaries = await this.getSummaryRange(fromDate, toDate);

    // CSV header
    const headers = [
      'Date',
      'Integrated Provider Payments',
      'Manual Provider Payments',
      'Wallet Topups',
      'Cash Collected',
      'Collector Earnings',
      'Marketer Commissions',
      'Approved Payouts',
      'Wallet Balance Liabilities',
      'Wallet Debits',
      'Collector Float Deductions',
      'Platform Share Cash Jobs',
      'Platform Share Cash First Pickup',
      'Manual Payments Pending (count)',
      'Manual Payments Pending (amount)',
      'Failed Provider Payments (count)',
      'Failed Provider Payments (amount)',
      'Unreconciled Items',
    ];

    // CSV rows
    const rows = summaries.map((s) => [
      s.summaryDate,
      s.integratedProviderPayments,
      s.manualProviderPayments,
      s.walletTopups,
      s.cashCollected,
      s.collectorEarnings,
      s.marketerCommissions,
      s.approvedPayouts,
      s.walletBalanceLiabilities,
      s.walletDebits,
      s.collectorFloatDeductions,
      s.platformShareCashJobs,
      s.platformShareCashFirstPickup,
      s.manualPaymentsPending,
      s.manualPaymentsPendingAmount,
      s.failedProviderPayments,
      s.failedProviderPaymentsAmount,
      s.unreconciledItems,
    ]);

    // Build CSV string
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    return Buffer.from(csvContent, 'utf-8');
  }
}
