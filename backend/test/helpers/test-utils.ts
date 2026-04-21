import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { User } from '../../src/users/entities/user.entity';
import { UserRole } from '../../src/common/enums/role.enum';
import { JobStatus } from '../../src/common/enums/job-status.enum';
import { Job } from '../../src/jobs/entities/job.entity';
import { EarningStatus } from '../../src/common/enums/earning-status.enum';
import { Earning } from '../../src/earnings/entities/earning.entity';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  accessToken: string;
}

export async function createTestUser(
  dataSource: DataSource,
  email: string,
  password: string,
  role: UserRole,
  name: string = 'Test User',
  phone: string = '+237600000000'
): Promise<User> {
  const userRepo = dataSource.getRepository(User);
  const passwordHash = await bcrypt.hash(password, 10);
  
  const user = userRepo.create({
    email,
    passwordHash,
    role,
    name,
    phone,
  });
  
  return await userRepo.save(user);
}

export async function createTestJob(
  dataSource: DataSource,
  householdId: string,
  overrides: Partial<Job> = {}
): Promise<Job> {
  const jobRepo = dataSource.getRepository(Job);
  const scheduledDate = new Date();
  scheduledDate.setDate(scheduledDate.getDate() + 1);
  
  const job = jobRepo.create({
    householdId,
    status: JobStatus.REQUESTED,
    scheduledDate: scheduledDate.toISOString().split('T')[0],
    scheduledTime: '09:00',
    locationAddress: '123 Test Street, Akwa, Douala',
    locationLat: 4.0,
    locationLng: 9.7,
    notes: 'Test job for integration testing',
    ...overrides,
  });
  
  return await jobRepo.save(job);
}

export async function createTestEarning(
  dataSource: DataSource,
  jobId: string,
  collectorId: string,
  totalAmount: number
): Promise<Earning> {
  const earningRepo = dataSource.getRepository(Earning);
  
  const earning = earningRepo.create({
    jobId,
    collectorId,
    baseAmount: totalAmount,
    totalAmount,
    status: EarningStatus.PENDING,
  });
  
  return await earningRepo.save(earning);
}

export async function loginAndGetToken(
  baseUrl: string,
  phone: string,
  password: string
): Promise<string> {
  const response = await request(baseUrl)
    .post('/api/v1/auth/login')
    .send({ phone, password })
    .expect(200);
  
  return response.body.accessToken;
}

export async function cleanupTestData(dataSource: DataSource): Promise<void> {
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
