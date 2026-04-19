import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LocationService } from './location.service';
import { LocationUpdate } from './entities/location-update.entity';
import { Job } from '../jobs/entities/job.entity';
import { JobStatus } from '../common/enums/job-status.enum';

describe('LocationService', () => {
  let service: LocationService;
  let locationRepo: any;
  let jobRepo: any;

  const makeJob = (overrides: any = {}): any => ({
    id: 'job-1',
    householdId: 'hh-1',
    collectorId: 'col-1',
    status: JobStatus.IN_PROGRESS,
    locationLat: 4.0435,
    locationLng: 9.6966,
    ...overrides,
  });

  const validInput = {
    jobId: 'job-1',
    latitude: 4.0511,
    longitude: 9.7679,
    accuracy: 15.0,
    speed: 2.5,
    heading: 180.0,
    networkType: '4G',
  };

  beforeEach(async () => {
    locationRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => ({
        id: 'loc-1',
        updatedAt: new Date(),
        ...data,
      })),
      save: jest.fn((entity) => Promise.resolve({ ...entity, updatedAt: new Date() })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    jobRepo = {
      findOne: jest.fn().mockResolvedValue(makeJob()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        { provide: getRepositoryToken(LocationUpdate), useValue: locationRepo },
        { provide: getRepositoryToken(Job), useValue: jobRepo },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);
  });

  // ─── Valid Updates ──────────────────────────────────────────────

  describe('updateLocation — success', () => {
    it('should create a new location record for first update', async () => {
      const result = await service.updateLocation('col-1', validInput);

      expect(locationRepo.create).toHaveBeenCalled();
      expect(locationRepo.save).toHaveBeenCalled();
      expect(result.jobId).toBe('job-1');
      expect(result.latitude).toBe(4.0511);
      expect(result.longitude).toBe(9.7679);
    });

    it('should update existing location record (upsert)', async () => {
      const existingLocation = {
        id: 'loc-1',
        jobId: 'job-1',
        collectorId: 'col-1',
        latitude: 4.0400,
        longitude: 9.7000,
        accuracy: 10,
        speed: null,
        heading: null,
        networkType: '3G',
        updatedAt: new Date(),
      };
      locationRepo.findOne.mockResolvedValue(existingLocation);

      const result = await service.updateLocation('col-1', validInput);

      // Should NOT call create — should update existing
      expect(locationRepo.create).not.toHaveBeenCalled();
      expect(locationRepo.save).toHaveBeenCalled();
      expect(result.latitude).toBe(4.0511);
      expect(result.longitude).toBe(9.7679);
      expect(result.accuracy).toBe(15.0);
      expect(result.networkType).toBe('4G');
    });

    it('should handle optional fields as null', async () => {
      const minimalInput = {
        jobId: 'job-1',
        latitude: 4.0511,
        longitude: 9.7679,
        accuracy: 15.0,
      };

      const result = await service.updateLocation('col-1', minimalInput);

      expect(result.speed).toBeNull();
      expect(result.heading).toBeNull();
      expect(result.networkType).toBeNull();
    });
  });

  // ─── Authorization ──────────────────────────────────────────────

  describe('updateLocation — authorization', () => {
    it('should reject if collector is not assigned to the job', async () => {
      await expect(
        service.updateLocation('other-col', validInput),
      ).rejects.toThrow('You are not assigned to this job');
    });

    it('should reject if job not found', async () => {
      jobRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateLocation('col-1', validInput),
      ).rejects.toThrow('Job not found');
    });
  });

  // ─── Job Status Validation ──────────────────────────────────────

  describe('updateLocation — status check', () => {
    it('should reject if job is not IN_PROGRESS', async () => {
      jobRepo.findOne.mockResolvedValue(makeJob({ status: JobStatus.COMPLETED }));

      await expect(
        service.updateLocation('col-1', validInput),
      ).rejects.toThrow('Job must be IN_PROGRESS');
    });

    it('should reject if job is ASSIGNED (not started yet)', async () => {
      jobRepo.findOne.mockResolvedValue(makeJob({ status: JobStatus.ASSIGNED }));

      await expect(
        service.updateLocation('col-1', validInput),
      ).rejects.toThrow('Job must be IN_PROGRESS');
    });

    it('should reject if job is REQUESTED', async () => {
      jobRepo.findOne.mockResolvedValue(makeJob({ status: JobStatus.REQUESTED }));

      await expect(
        service.updateLocation('col-1', validInput),
      ).rejects.toThrow('Job must be IN_PROGRESS');
    });
  });

  // ─── Coordinate Validation ──────────────────────────────────────

  describe('updateLocation — coordinate validation', () => {
    it('should reject invalid latitude > 90', async () => {
      await expect(
        service.updateLocation('col-1', { ...validInput, latitude: 91 }),
      ).rejects.toThrow('Invalid latitude');
    });

    it('should reject invalid latitude < -90', async () => {
      await expect(
        service.updateLocation('col-1', { ...validInput, latitude: -91 }),
      ).rejects.toThrow('Invalid latitude');
    });

    it('should reject invalid longitude > 180', async () => {
      await expect(
        service.updateLocation('col-1', { ...validInput, longitude: 181 }),
      ).rejects.toThrow('Invalid longitude');
    });

    it('should reject invalid longitude < -180', async () => {
      await expect(
        service.updateLocation('col-1', { ...validInput, longitude: -181 }),
      ).rejects.toThrow('Invalid longitude');
    });
  });

  // ─── Cleanup ────────────────────────────────────────────────────

  describe('deleteLocation', () => {
    it('should delete the location record for a job', async () => {
      await service.deleteLocation('job-1');
      expect(locationRepo.delete).toHaveBeenCalledWith({ jobId: 'job-1' });
    });
  });

  // ─── getLocation ────────────────────────────────────────────────

  describe('getLocation', () => {
    it('should return location if exists', async () => {
      locationRepo.findOne.mockResolvedValue({ id: 'loc-1', jobId: 'job-1' });
      const result = await service.getLocation('job-1');
      expect(result).toBeDefined();
      expect(result!.jobId).toBe('job-1');
    });

    it('should return null if no location', async () => {
      locationRepo.findOne.mockResolvedValue(null);
      const result = await service.getLocation('job-1');
      expect(result).toBeNull();
    });
  });
});
