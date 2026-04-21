// Integration test setup - loaded by Jest via setupFilesAfterEnv
// This file is not a test file itself, just setup code

import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import * as request from 'supertest';

let app: INestApplication;
let dataSource: DataSource;
let httpServer: any;
let baseUrl: string;

beforeAll(async () => {
  // Verify we're using test environment
  const nodeEnv = process.env.NODE_ENV || process.env.DOTENV_CONFIG_PATH?.includes('test') ? 'test' : 'unknown';
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
    'ratings', 'earnings', 'notifications', 
    'fraud_flags', 'disputes', 'jobs', 'users',
    'files', 'proofs', 'location_updates', 'collector_availability', 'system_config'
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
});

afterAll(async () => {
  // Clean database after tests
  if (dataSource) {
    const tables = [
      'ratings', 'earnings', 'notifications', 
      'fraud_flags', 'disputes', 'jobs', 'users',
      'files', 'proofs', 'location_updates', 'collector_availability', 'system_config'
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
