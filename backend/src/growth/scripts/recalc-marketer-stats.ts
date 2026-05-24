import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { MarketerProfile } from '../entities/marketer-profile.entity';
import { CommissionTransaction, CommissionStatus } from '../entities/commission-transaction.entity';

/**
 * Recalculate marketer stats from commission transactions
 * This fixes corrupted stats where pendingAmount doesn't match actual pending commissions
 */
async function recalcMarketerStats(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'waste',
    entities: [MarketerProfile, CommissionTransaction],
    synchronize: false,
  });

  await dataSource.initialize();

  const profileRepo = dataSource.getRepository(MarketerProfile);
  const transactionRepo = dataSource.getRepository(CommissionTransaction);

  const profiles = await profileRepo.find();

  for (const profile of profiles) {
    const transactions = await transactionRepo.find({
      where: { marketerProfileId: profile.id },
    });

    const pending = transactions
      .filter(t => t.status === CommissionStatus.PENDING)
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const approved = transactions
      .filter(t => t.status === CommissionStatus.APPROVED)
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const paid = transactions
      .filter(t => t.status === CommissionStatus.PAID)
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const totalEarned = approved + paid;

    if (
      profile.pendingAmount !== pending ||
      profile.approvedAmount !== approved ||
      profile.totalPaid !== paid ||
      profile.totalEarned !== totalEarned
    ) {
      console.log(`Fixing stats for marketer ${profile.id}:`);
      console.log(`  Before: pending=${profile.pendingAmount}, approved=${profile.approvedAmount}, paid=${profile.totalPaid}, earned=${profile.totalEarned}`);
      console.log(`  After:  pending=${pending}, approved=${approved}, paid=${paid}, earned=${totalEarned}`);

      profile.pendingAmount = pending;
      profile.approvedAmount = approved;
      profile.totalPaid = paid;
      profile.totalEarned = totalEarned;

      await profileRepo.save(profile);
    }
  }

  console.log('Marketer stats recalculated successfully');
  await dataSource.destroy();
}

recalcMarketerStats().catch(console.error);
