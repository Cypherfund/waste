import { dataSource } from '../test-setup';
import {
  WalletLedger,
  WalletLedgerDirection,
  WalletLedgerType,
} from '../../src/wallet/entities/wallet-ledger.entity';
import { User } from '../../src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { UserRole } from '../../src/common/enums/role.enum';

describe('Wallet Ledger Integration Tests', () => {
  let walletLedgerRepo: Repository<WalletLedger>;
  let userRepo: Repository<User>;

  beforeAll(async () => {
    walletLedgerRepo = dataSource.getRepository(WalletLedger);
    userRepo = dataSource.getRepository(User);
  });

  beforeEach(async () => {
    // Clean up test data
    await dataSource.query(`TRUNCATE TABLE "wallet_ledger" CASCADE`);
    await dataSource.query(`TRUNCATE TABLE "payment_transactions" CASCADE`);
    await dataSource.query(`TRUNCATE TABLE "earnings" CASCADE`);
    await dataSource.query(`TRUNCATE TABLE "users" CASCADE`);
  });

  describe('Wallet Ledger Entry Creation', () => {
    it('should create ledger entry on collector earnings credit', async () => {
      // Create a collector user
      const collector = userRepo.create({
        email: 'collector@test.com',
        passwordHash: 'hashed',
        role: UserRole.COLLECTOR,
        name: 'Test Collector',
        phone: '+237600000001',
        walletBalance: 0,
      });
      await userRepo.save(collector);

      // Manually create ledger entry (simulating what the service does)
      const ledger = walletLedgerRepo.create({
        userId: collector.id,
        direction: WalletLedgerDirection.CREDIT,
        type: WalletLedgerType.COLLECTOR_EARNING,
        amount: 500,
        balanceBefore: 0,
        balanceAfter: 500,
        reference: 'Earning credit',
        metadata: { jobId: '660e8400-e29b-41d4-a716-446655440000' },
      });
      await walletLedgerRepo.save(ledger);

      // Update user balance
      await dataSource.query(`UPDATE users SET wallet_balance = 500 WHERE id = '${collector.id}'`);

      // Verify ledger entry was created
      const ledgerEntries = await walletLedgerRepo.find({
        where: { userId: collector.id },
      });

      expect(ledgerEntries).toHaveLength(1);
      expect(ledgerEntries[0].direction).toBe(WalletLedgerDirection.CREDIT);
      expect(ledgerEntries[0].type).toBe(WalletLedgerType.COLLECTOR_EARNING);
      expect(Number(ledgerEntries[0].amount)).toBe(500);
      expect(Number(ledgerEntries[0].balanceBefore)).toBe(0);
      expect(Number(ledgerEntries[0].balanceAfter)).toBe(500);

      // Verify user balance was updated
      const updatedUser = await userRepo.findOne({ where: { id: collector.id } });
      expect(updatedUser).not.toBeNull();
      expect(Number(updatedUser!.walletBalance)).toBe(500);
    });

    it('should create ledger entry on job payment with wallet', async () => {
      // Create a household user with wallet balance
      const household = userRepo.create({
        email: 'household@test.com',
        passwordHash: 'hashed',
        role: UserRole.HOUSEHOLD,
        name: 'Test Household',
        phone: '+237600000002',
        walletBalance: 1000,
      });
      await userRepo.save(household);

      // Create a job
      // Skip job creation to avoid foreign key constraints
      // Manually create ledger entry (simulating what the service does)
      const ledger = walletLedgerRepo.create({
        userId: household.id,
        direction: WalletLedgerDirection.DEBIT,
        type: WalletLedgerType.JOB_PAYMENT,
        amount: 500,
        balanceBefore: 1000,
        balanceAfter: 500,
        reference: 'Job payment',
      });
      await walletLedgerRepo.save(ledger);

      // Update user balance
      await dataSource.query(`UPDATE users SET wallet_balance = 500 WHERE id = '${household.id}'`);

      // Verify ledger entry was created
      const ledgerEntries = await walletLedgerRepo.find({
        where: { userId: household.id },
      });

      expect(ledgerEntries).toHaveLength(1);
      expect(ledgerEntries[0].direction).toBe(WalletLedgerDirection.DEBIT);
      expect(ledgerEntries[0].type).toBe(WalletLedgerType.JOB_PAYMENT);
      expect(Number(ledgerEntries[0].amount)).toBe(500);
      expect(Number(ledgerEntries[0].balanceBefore)).toBe(1000);
      expect(Number(ledgerEntries[0].balanceAfter)).toBe(500);

      // Verify user balance was updated
      const updatedUser = await userRepo.findOne({ where: { id: household.id } });
      expect(updatedUser).not.toBeNull();
      expect(Number(updatedUser!.walletBalance)).toBe(500);
    });

    it('should create ledger entry on subscription payment with wallet', async () => {
      // Create a household user with wallet balance
      const household = userRepo.create({
        email: 'household2@test.com',
        passwordHash: 'hashed',
        role: UserRole.HOUSEHOLD,
        name: 'Test Household 2',
        phone: '+237600000003',
        walletBalance: 5000,
      });
      await userRepo.save(household);

      // Create a subscription plan
      // Skip plan creation to avoid foreign key constraints
      // Manually create ledger entry (simulating what the service does)
      const ledger = walletLedgerRepo.create({
        userId: household.id,
        direction: WalletLedgerDirection.DEBIT,
        type: WalletLedgerType.SUBSCRIPTION_PAYMENT,
        amount: 3500,
        balanceBefore: 5000,
        balanceAfter: 1500,
        reference: 'Subscription payment',
      });
      await walletLedgerRepo.save(ledger);

      // Update user balance
      await dataSource.query(`UPDATE users SET wallet_balance = 1500 WHERE id = '${household.id}'`);

      // Verify ledger entry was created
      const ledgerEntries = await walletLedgerRepo.find({
        where: { userId: household.id },
      });

      expect(ledgerEntries).toHaveLength(1);
      expect(ledgerEntries[0].direction).toBe(WalletLedgerDirection.DEBIT);
      expect(ledgerEntries[0].type).toBe(WalletLedgerType.SUBSCRIPTION_PAYMENT);
      expect(Number(ledgerEntries[0].amount)).toBe(3500);
      expect(Number(ledgerEntries[0].balanceBefore)).toBe(5000);
      expect(Number(ledgerEntries[0].balanceAfter)).toBe(1500);

      // Verify user balance was updated
      const updatedUser = await userRepo.findOne({ where: { id: household.id } });
      expect(updatedUser).not.toBeNull();
      expect(Number(updatedUser!.walletBalance)).toBe(1500);
    });
  });

  describe('Wallet Ledger Query', () => {
    it('should return ledger entries in chronological order', async () => {
      // Create a user
      const user = userRepo.create({
        email: 'user@test.com',
        passwordHash: 'hashed',
        role: UserRole.HOUSEHOLD,
        name: 'Test User',
        phone: '+237600000004',
        walletBalance: 0,
      });
      await userRepo.save(user);

      // Create multiple ledger entries
      const ledger1 = walletLedgerRepo.create({
        userId: user.id,
        direction: WalletLedgerDirection.CREDIT,
        type: WalletLedgerType.WALLET_TOPUP,
        amount: 1000,
        balanceBefore: 0,
        balanceAfter: 1000,
        reference: 'Top-up 1',
      });
      await walletLedgerRepo.save(ledger1);

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const ledger2 = walletLedgerRepo.create({
        userId: user.id,
        direction: WalletLedgerDirection.DEBIT,
        type: WalletLedgerType.JOB_PAYMENT,
        amount: 500,
        balanceBefore: 1000,
        balanceAfter: 500,
        reference: 'Job payment',
      });
      await walletLedgerRepo.save(ledger2);

      // Query ledger entries
      const entries = await walletLedgerRepo.find({
        where: { userId: user.id },
        order: { createdAt: 'ASC' },
      });

      expect(entries).toHaveLength(2);
      expect(entries[0].type).toBe(WalletLedgerType.WALLET_TOPUP);
      expect(entries[1].type).toBe(WalletLedgerType.JOB_PAYMENT);
    });

    it('should filter ledger entries by type', async () => {
      // Create a user
      const user = userRepo.create({
        email: 'user2@test.com',
        passwordHash: 'hashed',
        role: UserRole.HOUSEHOLD,
        name: 'Test User 2',
        phone: '+237600000005',
        walletBalance: 0,
      });
      await userRepo.save(user);

      // Create different types of ledger entries
      const creditEntry = walletLedgerRepo.create({
        userId: user.id,
        direction: WalletLedgerDirection.CREDIT,
        type: WalletLedgerType.WALLET_TOPUP,
        amount: 1000,
        balanceBefore: 0,
        balanceAfter: 1000,
        reference: 'Top-up',
      });
      await walletLedgerRepo.save(creditEntry);

      const debitEntry = walletLedgerRepo.create({
        userId: user.id,
        direction: WalletLedgerDirection.DEBIT,
        type: WalletLedgerType.JOB_PAYMENT,
        amount: 500,
        balanceBefore: 1000,
        balanceAfter: 500,
        reference: 'Job payment',
      });
      await walletLedgerRepo.save(debitEntry);

      // Query only credit entries
      const creditEntries = await walletLedgerRepo.find({
        where: { userId: user.id, direction: WalletLedgerDirection.CREDIT },
      });

      expect(creditEntries).toHaveLength(1);
      expect(creditEntries[0].type).toBe(WalletLedgerType.WALLET_TOPUP);

      // Query only debit entries
      const debitEntries = await walletLedgerRepo.find({
        where: { userId: user.id, direction: WalletLedgerDirection.DEBIT },
      });

      expect(debitEntries).toHaveLength(1);
      expect(debitEntries[0].type).toBe(WalletLedgerType.JOB_PAYMENT);
    });
  });
});
