// Integration test setup - loaded by Jest via setupFilesAfterEnv
// This file is not a test file itself, just setup code

import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import * as request from 'supertest';
import * as dotenv from 'dotenv';
import { PaymentService } from '../src/payments/payment.service';

// Load test environment variables
dotenv.config({ path: './.env.test' });

let app: INestApplication;
let dataSource: DataSource;
let httpServer: any;
let baseUrl: string;

beforeAll(async () => {
  // Verify we're using test environment
  const nodeEnv =
    process.env.NODE_ENV || process.env.DOTENV_CONFIG_PATH?.includes('test') ? 'test' : 'unknown';
  console.log(`[Integration Tests] Running in NODE_ENV: ${nodeEnv}`);
  console.log(`[Integration Tests] Database: ${process.env.DATABASE_NAME}`);

  if (!process.env.DATABASE_NAME?.includes('test')) {
    console.warn('[Integration Tests] WARNING: Not using a test database!');
    console.warn('[Integration Tests] DATABASE_NAME should be "waste_management_test"');
  }

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(APP_GUARD)
    .useValue([])
    .overrideProvider(PaymentService)
    .useValue({
      initiatePayment: jest.fn().mockResolvedValue({ id: 'mock-tx-id', status: 'PENDING' }),
      getTransaction: jest.fn().mockResolvedValue({ id: 'mock-tx-id', status: 'PENDING' }),
      checkTransactionStatus: jest.fn().mockResolvedValue({ id: 'mock-tx-id', status: 'PENDING' }),
      getProviderByCode: jest.fn().mockImplementation((code) => Promise.resolve({
        paymentCode: code,
        providerName: 'Test Provider',
        integrationEnabled: true,
        isEnabled: true,
      })),
    })
    .compile();

  app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1'); // Set global prefix to match production
  await app.init();
  await app.listen(0, '127.0.0.1'); // Use random available port on IPv4 localhost

  httpServer = app.getHttpServer();
  dataSource = app.get(DataSource);

  baseUrl = await app.getUrl();
  console.log(`[Integration Tests] App listening on: ${baseUrl}`);
  console.log(`[Integration Tests] Connected to database: ${dataSource.options.database}`);

  // Clean database before tests - handle missing tables gracefully
  const tables = [
    'ratings',
    'earnings',
    'notifications',
    'fraud_flags',
    'disputes',
    'jobs',
    'users',
    'files',
    'proofs',
    'location_updates',
    'collector_availability',
    'system_config',
    'user_subscriptions',
    'subscription_plans',
    'payment_transactions',
    'payout_requests',
    'collector_float_ledger',
    'user_payment_methods',
    'payment_providers',
    'leads',
    'marketer_profiles',
    'commission_schemes',
    'marketer_scheme_assignments',
    'commission_transactions',
    'marketer_payout_requests',
    'marketer_notifications',
    'marketing_budget_periods',
    'marketing_campaigns',
    'campaign_marketer_assignments',
    'campaign_commission_schemes',
    'budget_transactions',
    'reconciliation_summaries',
  ];

  for (const table of tables) {
    try {
      await dataSource.query(`TRUNCATE TABLE "${table}" CASCADE`);
    } catch (error: any) {
      if (error.message.includes('does not exist')) {
        // Table doesn't exist yet, that's okay for first run
        console.log(`[Integration Tests] Table "${table}" does not exist, skipping cleanup`);
      } else {
        throw error;
      }
    }
  }

  // Seed required system_config values for tests (category is NOT NULL)
  try {
    await dataSource.query(`
      INSERT INTO system_config (key, value, category, description) VALUES
        ('pricing.per_pickup_price',              '500',  'pricing',    'Price per pickup in XAF'),
        ('pricing.subscription_pickups_per_week', '3',    'pricing',    'Default pickups per week for subscription plans'),
        ('pricing.weeks_per_month',               '4',    'pricing',    'Weeks per month used for savings calculation'),
        ('assignment.auto_assign_radius_km',      '10',   'assignment', 'Radius in km for auto-assigning collectors'),
        ('assignment.acceptance_timeout_s',       '120',  'assignment', 'Seconds collector has to accept before reassignment')
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `);
  } catch (error: any) {
    console.log('[Integration Tests] Could not seed system_config:', error.message);
  }
});

afterAll(async () => {
  // Clean database after tests
  if (dataSource) {
    const tables = [
      'ratings',
      'earnings',
      'notifications',
      'fraud_flags',
      'disputes',
      'jobs',
      'users',
      'files',
      'proofs',
      'location_updates',
      'collector_availability',
      'system_config',
      'user_subscriptions',
      'subscription_plans',
      'payment_transactions',
      'payout_requests',
      'collector_float_ledger',
      'user_payment_methods',
      'payment_providers',
      'leads',
      'marketer_profiles',
      'commission_schemes',
      'marketer_scheme_assignments',
      'commission_transactions',
      'marketer_payout_requests',
      'marketer_notifications',
      'marketing_budget_periods',
      'marketing_campaigns',
      'campaign_marketer_assignments',
      'campaign_commission_schemes',
      'budget_transactions',
    ];

    for (const table of tables) {
      try {
        await dataSource.query(`TRUNCATE TABLE "${table}" CASCADE`);
      } catch (error: any) {
        if (!error.message.includes('does not exist')) {
          throw error;
        }
      }
    }
  }

  if (app) {
    await app.close();
  }
});

export { app, dataSource, httpServer, baseUrl, request };
