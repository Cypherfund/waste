/// Integration test: Full Job Lifecycle through Providers
///
/// Tests the complete job flow using mocked API services, verifying that
/// providers, models, and WebSocket updates work together correctly:
///   Create → Assign (WS) → Start (WS) → Complete → Validate → Rate
library;
import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:dio/dio.dart';
import 'package:wastewise/models/job.dart';
import 'package:wastewise/models/rating.dart';
import 'package:wastewise/providers/job_provider.dart';
import 'package:wastewise/services/api/job_api.dart';
import 'package:wastewise/services/offline/sync_service.dart';
import 'package:wastewise/services/websocket/websocket_service.dart';

class MockJobApi extends Mock implements JobApi {}

class MockWebSocketService extends Mock implements WebSocketService {}

class MockSyncService extends Mock implements SyncService {}

void main() {
  late MockJobApi mockJobApi;
  late MockWebSocketService mockWsService;
  late MockSyncService mockSyncService;
  late JobProvider provider;
  late StreamController<JobStatusUpdate> wsController;

  // Test data factory
  Job makeJob({
    String id = 'job-lifecycle-1',
    JobStatus status = JobStatus.requested,
    String? collectorId,
  }) =>
      Job(
        id: id,
        householdId: 'hh-1',
        collectorId: collectorId,
        status: status,
        scheduledDate: '2026-04-25',
        scheduledTime: '09:00',
        locationAddress: '123 Integration Test Street, Douala',
        locationLat: 4.04,
        locationLng: 9.69,
        notes: 'Integration test job',
        createdAt: DateTime(2026, 4, 22),
        updatedAt: DateTime(2026, 4, 22),
      );

  setUp(() {
    mockJobApi = MockJobApi();
    mockWsService = MockWebSocketService();
    mockSyncService = MockSyncService();
    wsController = StreamController<JobStatusUpdate>.broadcast();

    when(() => mockWsService.jobStatusStream)
        .thenAnswer((_) => wsController.stream);
    when(() => mockWsService.subscribeToJob(any())).thenReturn(null);
    when(() => mockSyncService.syncJobs(any())).thenAnswer((_) async => {});
    when(() => mockSyncService.updateJob(any())).thenAnswer((_) async => {});
    when(() => mockSyncService.addJob(any())).thenAnswer((_) async => {});

    provider = JobProvider(
      jobApi: mockJobApi,
      syncService: mockSyncService,
      wsService: mockWsService,
    );
  });

  setUpAll(() {
    registerFallbackValue(JobStatus.requested);
    registerFallbackValue(Job(
      id: 'fb',
      householdId: 'hh',
      status: JobStatus.requested,
      scheduledDate: '',
      scheduledTime: '',
      locationAddress: '',
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    ));
    registerFallbackValue(PaginatedJobs(
      data: [],
      page: 1,
      limit: 20,
      total: 0,
      pages: 1,
    ));
  });

  tearDown(() {
    wsController.close();
    provider.dispose();
  });

  group('Full Job Lifecycle Integration', () {
    test('Step 1: Household creates a job via provider', () async {
      final createdJob = makeJob();

      when(() => mockJobApi.createJob(
            scheduledDate: any(named: 'scheduledDate'),
            scheduledTime: any(named: 'scheduledTime'),
            locationAddress: any(named: 'locationAddress'),
            locationLat: any(named: 'locationLat'),
            locationLng: any(named: 'locationLng'),
            notes: any(named: 'notes'),
          )).thenAnswer((_) async => createdJob);

      final result = await provider.createJob(
        scheduledDate: DateTime(2026, 4, 25),
        scheduledTime: '09:00',
        locationAddress: '123 Integration Test Street, Douala',
        locationLat: 4.04,
        locationLng: 9.69,
        notes: 'Integration test job',
      );

      expect(result, isNotNull);
      expect(result!.id, 'job-lifecycle-1');
      expect(result.status, JobStatus.requested);
      expect(provider.jobs.length, 1);
      expect(provider.jobs.first.isActive, true);

      // Verify WebSocket subscription was triggered
      verify(() => mockWsService.subscribeToJob('job-lifecycle-1')).called(1);
    });

    test('Step 2: Job appears in household job list after creation', () async {
      final jobs = [makeJob()];
      when(() => mockJobApi.getMyJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: jobs,
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));

      await provider.loadJobs(refresh: true);

      expect(provider.jobs.length, 1);
      expect(provider.jobs.first.status, JobStatus.requested);
      expect(provider.activeJobs.length, 1);
      expect(provider.completedJobs.length, 0);
      expect(provider.error, isNull);
    });

    test('Step 3: Real-time WebSocket update → job assigned', () async {
      // Load initial job
      when(() => mockJobApi.getMyJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [makeJob()],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));
      await provider.loadJobs(refresh: true);
      expect(provider.jobs.first.status, JobStatus.requested);

      // Simulate WS assignment event (from backend)
      wsController.add(JobStatusUpdate(
        jobId: 'job-lifecycle-1',
        status: JobStatus.assigned,
        collectorId: 'col-1',
        updatedAt: DateTime.now(),
      ));
      await Future.delayed(Duration.zero);

      expect(provider.jobs.first.status, JobStatus.assigned);
      expect(provider.jobs.first.collectorId, 'col-1');
      expect(provider.jobs.first.isActive, true);
    });

    test('Step 4: Real-time WebSocket update → job inProgress', () async {
      // Load assigned job
      when(() => mockJobApi.getMyJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [makeJob(status: JobStatus.assigned, collectorId: 'col-1')],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));
      await provider.loadJobs(refresh: true);

      // Simulate WS start event
      wsController.add(JobStatusUpdate(
        jobId: 'job-lifecycle-1',
        status: JobStatus.inProgress,
        collectorId: 'col-1',
        updatedAt: DateTime.now(),
      ));
      await Future.delayed(Duration.zero);

      expect(provider.jobs.first.status, JobStatus.inProgress);
      expect(provider.jobs.first.isActive, true);
      expect(provider.jobs.first.canCancel, false);
    });

    test('Step 5: Real-time WebSocket update → job completed', () async {
      when(() => mockJobApi.getMyJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [
              makeJob(status: JobStatus.inProgress, collectorId: 'col-1')
            ],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));
      await provider.loadJobs(refresh: true);

      // Simulate WS completion event
      wsController.add(JobStatusUpdate(
        jobId: 'job-lifecycle-1',
        status: JobStatus.completed,
        collectorId: 'col-1',
        updatedAt: DateTime.now(),
      ));
      await Future.delayed(Duration.zero);

      expect(provider.jobs.first.status, JobStatus.completed);
      expect(provider.jobs.first.isActive, false);
      expect(provider.jobs.first.canValidate, true);
      expect(provider.completedJobs.length, 1);
    });

    test('Step 6: Household validates the completed job', () async {
      // Load completed job
      final completedJob =
          makeJob(status: JobStatus.completed, collectorId: 'col-1');
      when(() => mockJobApi.getMyJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [completedJob],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));
      await provider.loadJobs(refresh: true);

      expect(provider.jobs.first.canValidate, true);

      // Validate
      final validatedJob =
          makeJob(status: JobStatus.validated, collectorId: 'col-1');
      when(() => mockJobApi.validateProof('job-lifecycle-1'))
          .thenAnswer((_) async => validatedJob);

      final success = await provider.validateProof('job-lifecycle-1');

      expect(success, true);
      expect(provider.jobs.first.status, JobStatus.validated);
      expect(provider.jobs.first.canRate, true);
    });

    test('Step 7: Household rates the validated job', () async {
      // Load validated job
      final validatedJob =
          makeJob(status: JobStatus.validated, collectorId: 'col-1');
      when(() => mockJobApi.getMyJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [validatedJob],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));
      await provider.loadJobs(refresh: true);

      // Rate
      when(() =>
              mockJobApi.rateJob('job-lifecycle-1', rating: 5, comment: 'Great'))
          .thenAnswer((_) async => Rating(
                id: 'rating-1',
                jobId: 'job-lifecycle-1',
                householdId: 'hh-1',
                collectorId: 'col-1',
                value: 5,
                comment: 'Great',
                createdAt: DateTime.now(),
              ));

      final ratedJob =
          makeJob(status: JobStatus.rated, collectorId: 'col-1');
      when(() => mockJobApi.getJob('job-lifecycle-1'))
          .thenAnswer((_) async => ratedJob);

      final success = await provider.rateJob(
        'job-lifecycle-1',
        5,
        comment: 'Great',
      );

      expect(success, true);
      expect(provider.jobs.first.status, JobStatus.rated);
      expect(provider.jobs.first.isTerminal, true);
    });
  });

  group('Job Cancellation Integration', () {
    test('household can cancel a requested job', () async {
      when(() => mockJobApi.getMyJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [makeJob()],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));
      await provider.loadJobs(refresh: true);
      expect(provider.jobs.first.canCancel, true);

      final cancelledJob = makeJob(status: JobStatus.cancelled);
      when(() => mockJobApi.cancelJob('job-lifecycle-1',
              reason: 'No longer needed'))
          .thenAnswer((_) async => cancelledJob);

      final success = await provider.cancelJob('job-lifecycle-1',
          reason: 'No longer needed');

      expect(success, true);
      expect(provider.jobs.first.status, JobStatus.cancelled);
      expect(provider.jobs.first.isTerminal, true);
    });

    test('cancel fails for completed job (backend rejects)', () async {
      final completedJob =
          makeJob(status: JobStatus.completed, collectorId: 'col-1');
      when(() => mockJobApi.getMyJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [completedJob],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));
      await provider.loadJobs(refresh: true);
      expect(provider.jobs.first.canCancel, false);

      when(() => mockJobApi.cancelJob('job-lifecycle-1', reason: 'Changed mind'))
          .thenThrow(DioException(
        requestOptions: RequestOptions(path: '/jobs/job-lifecycle-1/cancel'),
        response: Response(
          requestOptions:
              RequestOptions(path: '/jobs/job-lifecycle-1/cancel'),
          statusCode: 400,
          data: {
            'message':
                'Households can only cancel jobs in requested or assigned status'
          },
        ),
      ));

      final success =
          await provider.cancelJob('job-lifecycle-1', reason: 'Changed mind');

      expect(success, false);
      expect(provider.error, contains('requested or assigned'));
    });
  });

  group('WebSocket Real-time Update Integration', () {
    test('multiple rapid WS updates are applied in order', () async {
      when(() => mockJobApi.getMyJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [makeJob()],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));
      await provider.loadJobs(refresh: true);

      // Simulate rapid status transitions via WS
      wsController.add(JobStatusUpdate(
        jobId: 'job-lifecycle-1',
        status: JobStatus.assigned,
        collectorId: 'col-1',
        updatedAt: DateTime.now(),
      ));
      wsController.add(JobStatusUpdate(
        jobId: 'job-lifecycle-1',
        status: JobStatus.inProgress,
        collectorId: 'col-1',
        updatedAt: DateTime.now(),
      ));
      wsController.add(JobStatusUpdate(
        jobId: 'job-lifecycle-1',
        status: JobStatus.completed,
        collectorId: 'col-1',
        updatedAt: DateTime.now(),
      ));

      await Future.delayed(const Duration(milliseconds: 50));

      expect(provider.jobs.first.status, JobStatus.completed);
    });

    test('WS updates for unknown jobs are ignored', () async {
      when(() => mockJobApi.getMyJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [makeJob()],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));
      await provider.loadJobs(refresh: true);

      wsController.add(JobStatusUpdate(
        jobId: 'unknown-job-id',
        status: JobStatus.completed,
        updatedAt: DateTime.now(),
      ));
      await Future.delayed(Duration.zero);

      // Original job unchanged
      expect(provider.jobs.first.status, JobStatus.requested);
    });

    test('WS updates across multiple jobs work independently', () async {
      final job1 = makeJob(id: 'job-1');
      final job2 = makeJob(id: 'job-2');
      when(() => mockJobApi.getMyJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [job1, job2],
            page: 1,
            limit: 20,
            total: 2,
            pages: 1,
          ));
      await provider.loadJobs(refresh: true);

      // Only update job-1
      wsController.add(JobStatusUpdate(
        jobId: 'job-1',
        status: JobStatus.assigned,
        collectorId: 'col-1',
        updatedAt: DateTime.now(),
      ));
      await Future.delayed(Duration.zero);

      expect(provider.jobs[0].status, JobStatus.assigned);
      expect(provider.jobs[1].status, JobStatus.requested);
    });
  });

  group('Error Handling Integration', () {
    test('network error on job creation shows appropriate message', () async {
      when(() => mockJobApi.createJob(
            scheduledDate: any(named: 'scheduledDate'),
            scheduledTime: any(named: 'scheduledTime'),
            locationAddress: any(named: 'locationAddress'),
            locationLat: any(named: 'locationLat'),
            locationLng: any(named: 'locationLng'),
            notes: any(named: 'notes'),
          )).thenThrow(DioException(
        requestOptions: RequestOptions(path: '/jobs'),
        type: DioExceptionType.connectionTimeout,
      ));

      final result = await provider.createJob(
        scheduledDate: DateTime(2026, 4, 25),
        scheduledTime: '09:00',
        locationAddress: 'Test',
      );

      expect(result, isNull);
      expect(provider.error, isNotNull);
      expect(provider.isLoading, false);
    });

    test('clearError resets error state', () async {
      when(() => mockJobApi.getMyJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
          )).thenThrow(DioException(
        requestOptions: RequestOptions(path: '/jobs/mine'),
        type: DioExceptionType.connectionError,
      ));

      await provider.loadJobs(refresh: true);
      expect(provider.error, isNotNull);

      provider.clearError();
      expect(provider.error, isNull);
    });
  });
}
