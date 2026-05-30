import { DataSource } from 'typeorm';

/**
 * Recalculate marketer stats from commission transactions using raw SQL
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
    synchronize: false,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await dataSource.initialize();

  // Get all marketer profiles
  const profiles = await dataSource.query(`
    SELECT id, pending_amount, approved_amount, total_paid, total_earned
    FROM marketer_profiles
  `);

  for (const profile of profiles) {
    // Calculate actual stats from commission transactions
    const stats = await dataSource.query(
      `
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) as pending,
        COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN amount ELSE 0 END), 0) as approved,
        COALESCE(SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END), 0) as paid
      FROM commission_transactions
      WHERE marketer_profile_id = $1
    `,
      [profile.id],
    );

    const { pending, approved, paid } = stats[0];
    const totalEarned = parseFloat(approved) + parseFloat(paid);

    if (
      parseFloat(profile.pending_amount) !== parseFloat(pending) ||
      parseFloat(profile.approved_amount) !== parseFloat(approved) ||
      parseFloat(profile.total_paid) !== parseFloat(paid) ||
      parseFloat(profile.total_earned) !== totalEarned
    ) {
      console.log(`Fixing stats for marketer ${profile.id}:`);
      console.log(
        `  Before: pending=${profile.pending_amount}, approved=${profile.approved_amount}, paid=${profile.total_paid}, earned=${profile.total_earned}`,
      );
      console.log(
        `  After:  pending=${pending}, approved=${approved}, paid=${paid}, earned=${totalEarned}`,
      );

      await dataSource.query(
        `
        UPDATE marketer_profiles
        SET pending_amount = $1,
            approved_amount = $2,
            total_paid = $3,
            total_earned = $4
        WHERE id = $5
      `,
        [pending, approved, paid, totalEarned, profile.id],
      );
    }
  }

  console.log('Marketer stats recalculated successfully');
  await dataSource.destroy();
}

recalcMarketerStats().catch(console.error);
