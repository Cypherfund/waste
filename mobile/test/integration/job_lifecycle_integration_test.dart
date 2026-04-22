/// Integration test: Full Job Lifecycle through Providers
///
/// Tests the complete job flow using mocked API services, verifying that
/// providers, models, and WebSocket updates work together correctly:
///   Create → Assign (WS) → Start (WS) → Complete → Validate → Rate
import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:dio/dio.dart';
import 'package:wastewise/models/job.dart';
import 'package:wastewise/models/rating.dart';
import 'package:wastewise/providers/jobs_provider.dart';
import 'package:wastewise/services/api/jobs_api.dart';
import 'package:wastewise/services/websocket/websocket_service.dart';

class MockJobsApi extends Mock implements JobsApi {}

class MockWebSocketService extends Mock implements WebSocketService {}

void main() {
  late MockJobsApi mockJobsApi;
  late MockWebSocketService mockWsService;
  late JobsProvider provider;
  late StreamController<JobStatusUpdate> wsController;

  // Test data factory
  Job makeJob({
    String id = 'job-lifecycle-1',
    JobStatus status = JobStatus.REQUESTED,
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
    mockJobsApi = MockJobsApi();
    mockWsService = MockWebSocketService();
    wsController = StreamController<JobStatusUpdate>.broadcast();

    when(() => mockWsService.jobStatusStream)
        .thenAnswer((_) => wsController.stream);
    when(() => mockWsService.subscribeToJob(any())).thenReturn(null);

    provider = JobsProvider(
      jobsApi: mockJobsApi,
      wsService: mockWsService,
    );
  });

  tearDown(() {
    wsController.close();
    provider.dispose();
  });

  group('Full Job Lifecycle Integration', () {
    test('Step 1: Household creates a job via provider', () async {
      final createdJob = makeJob();

      when(() => mockJobsApi.createJob(
            scheduledDate: any(named: 'scheduledDate'),
            scheduledTime: any(named: 'scheduledTime'),
            locationAddress: any(named: 'locationAddress'),
            locationLat: any(named: 'locationLat'),
            locationLng: any(named: 'locationLng'),
            notes: any(named: 'notes'),
          )).thenAnswer((_) async => createdJob);

      final result = await provider.createJob(
        scheduledDate: '2026-04-25',
        scheduledTime: '09:00',
        locationAddress: '123 Integration Test Street, Douala',
        locationLat: 4.04,
        locationLng: 9.69,
        notes: 'Integration test job',
      );

      expect(result, isNotNull);
      expect(result!.id, 'job-lifecycle-1');
      expect(result.status, JobStatus.REQUESTED);
      expect(provider.jobs.length, 1);
      expect(provider.jobs.first.isActive, true);

      // Verify WebSocket subscription was triggered
      verify(() => mockWsService.subscribeToJob('job-lifecycle-1')).called(1);
    });

    test('Step 2: Job appears in household job list after creation', () async {
      final jobs = [makeJob()];
      when(() => mockJobsApi.getMyJobs(
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
      expect(provider.jobs.first.status, JobStatus.REQUESTED);
      expect(provider.activeJobs.length, 1);
      expect(provider.completedJobs.length, 0);
      expect(provider.error, isNull);
    });

    test('Step 3: Real-time WebSocket update → job ASSIGNED', () async {
      // Load initial job
      when(() => mockJobsApi.getMyJobs(
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
      expect(provider.jobs.first.status, JobStatus.REQUESTED);

      // Simulate WS assignment event (from backend)
      wsController.add(JobStatusUpdate(
        jobId: 'job-lifecycle-1',
        status: JobStatus.ASSIGNED,
        collectorId: 'col-1',
        updatedAt: DateTime.now(),
      ));
      await Future.delayed(Duration.zero);

      expect(provider.jobs.first.status, JobStatus.ASSIGNED);
      expect(provider.jobs.first.collectorId, 'col-1');
      expect(provider.jobs.first.isActive, true);
    });

    test('Step 4: Real-time WebSocket update → job IN_PROGRESS', () async {
      // Load ASSIGNED job
      when(() => mockJobsApi.getMyJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [makeJob(status: JobStatus.ASSIGNED, collectorId: 'col-1')],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));
      await provider.loadJobs(refresh: true);

      // Simulate WS start event
      wsController.add(JobStatusUpdate(
        jobId: 'job-lifecycle-1',
        status: JobStatus.IN_PROGRESS,
        collectorId: 'col-1',
        updatedAt: DateTime.now(),
      ));
      await Future.delayed(Duration.zero);

      expect(provider.jobs.first.status, JobStatus.IN_PROGRESS);
      expect(provider.jobs.first.isActive, true);
      expect(provider.jobs.first.canCancel, false);
    });

    test('Step 5: Real-time WebSocket update → job COMPLETED', () async {
      when(() => mockJobsApi.getMyJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [
              makeJob(status: JobStatus.IN_PROGRESS, collectorId: 'col-1')
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
        status: JobStatus.COMPLETED,
        collectorId: 'col-1',
        updatedAt: DateTime.now(),
      ));
      await Future.delayed(Duration.zero);

      expect(provider.jobs.first.status, JobStatus.COMPLETED);
      expect(provider.jobs.first.isActive, false);
      expect(provider.jobs.first.canValidate, true);
      expect(provider.completedJobs.length, 1);
    });

    test('Step 6: Household validates the completed job', () async {
      // Load completed job
      final completedJob =
          makeJob(status: JobStatus.COMPLETED, collectorId: 'col-1');
      when(() => mockJobsApi.getMyJobs(
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
          makeJob(status: JobStatus.VALIDATED, collectorId: 'col-1');
      when(() => mockJobsApi.validateJob('job-lifecycle-1'))
          .thenAnswer((_) async => validatedJob);

      final success = await provider.validateJob('job-lifecycle-1');

      expect(success, true);
      expect(provider.jobs.first.status, JobStatus.VALIDATED);
      expect(provider.jobs.first.canRate, true);
    });

    test('Step 7: Household rates the validated job', () async {
      // Load validated job
      final validatedJob =
          makeJob(status: JobStatus.VALIDATED, collectorId: 'col-1');
      when(() => mockJobsApi.getMyJobs(
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
              mockJobsApi.rateJob('job-lifecycle-1', value: 5, comment: 'Great'))
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
          makeJob(status: JobStatus.RATED, collectorId: 'col-1');
      when(() => mockJobsApi.getJob('job-lifecycle-1'))
          .thenAnswer((_) async => ratedJob);

      final success = await provider.rateJob(
        'job-lifecycle-1',
        value: 5,
        comment: 'Great',
      );

      expect(success, true);
      expect(provider.jobs.first.status, JobStatus.RATED);
      expect(provider.jobs.first.isTerminal, true);
    });
  });

  group('Job Cancellation Integration', () {
    test('household can cancel a REQUESTED job', () async {
      when(() => mockJobsApi.getMyJobs(
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

      final cancelledJob = makeJob(status: JobStatus.CANCELLED);
      when(() => mockJobsApi.cancelJob('job-lifecycle-1',
              reason: 'No longer needed'))
          .thenAnswer((_) async => cancelledJob);

      final success = await provider.cancelJob('job-lifecycle-1',
          reason: 'No longer needed');

      expect(success, true);
      expect(provider.jobs.first.status, JobStatus.CANCELLED);
      expect(provider.jobs.first.isTerminal, true);
    });

    test('cancel fails for COMPLETED job (backend rejects)', () async {
      final completedJob =
          makeJob(status: JobStatus.COMPLETED, collectorId: 'col-1');
      when(() => mockJobsApi.getMyJobs(
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

      when(() => mockJobsApi.cancelJob('job-lifecycle-1', reason: 'Changed mind'))
          .thenThrow(DioException(
        requestOptions: RequestOptions(path: '/jobs/job-lifecycle-1/cancel'),
        response: Response(
          requestOptions:
              RequestOptions(path: '/jobs/job-lifecycle-1/cancel'),
          statusCode: 400,
          data: {
            'message':
                'Households can only cancel jobs in REQUESTED or ASSIGNED status'
          },
        ),
      ));

      final success =
          await provider.cancelJob('job-lifecycle-1', reason: 'Changed mind');

      expect(success, false);
      expect(provider.error, contains('REQUESTED or ASSIGNED'));
    });
  });

  group('WebSocket Real-time Update Integration', () {
    test('multiple rapid WS updates are applied in order', () async {
      when(() => mockJobsApi.getMyJobs(
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
        status: JobStatus.ASSIGNED,
        collectorId: 'col-1',
        updatedAt: DateTime.now(),
      ));
      wsController.add(JobStatusUpdate(
        jobId: 'job-lifecycle-1',
        status: JobStatus.IN_PROGRESS,
        collectorId: 'col-1',
        updatedAt: DateTime.now(),
      ));
      wsController.add(JobStatusUpdate(
        jobId: 'job-lifecycle-1',
        status: JobStatus.COMPLETED,
        collectorId: 'col-1',
        updatedAt: DateTime.now(),
      ));

      await Future.delayed(const Duration(milliseconds: 50));

      expect(provider.jobs.first.status, JobStatus.COMPLETED);
    });

    test('WS updates for unknown jobs are ignored', () async {
      when(() => mockJobsApi.getMyJobs(
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
        status: JobStatus.COMPLETED,
        updatedAt: DateTime.now(),
      ));
      await Future.delayed(Duration.zero);

      // Original job unchanged
      expect(provider.jobs.first.status, JobStatus.REQUESTED);
    });

    test('WS updates across multiple jobs work independently', () async {
      final job1 = makeJob(id: 'job-1');
      final job2 = makeJob(id: 'job-2');
      when(() => mockJobsApi.getMyJobs(
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
        status: JobStatus.ASSIGNED,
        collectorId: 'col-1',
        updatedAt: DateTime.now(),
      ));
      await Future.delayed(Duration.zero);

      expect(provider.jobs[0].status, JobStatus.ASSIGNED);
      expect(provider.jobs[1].status, JobStatus.REQUESTED);
    });
  });

  group('Error Handling Integration', () {
    test('network error on job creation shows appropriate message', () async {
      when(() => mockJobsApi.createJob(
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
        scheduledDate: '2026-04-25',
        scheduledTime: '09:00',
        locationAddress: 'Test',
      );

      expect(result, isNull);
      expect(provider.error, isNotNull);
      expect(provider.isLoading, false);
    });

    test('clearError resets error state', () async {
      when(() => mockJobsApi.getMyJobs(
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
