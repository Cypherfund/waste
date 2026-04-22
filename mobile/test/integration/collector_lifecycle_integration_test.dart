/// Integration test: Collector Job Lifecycle through Providers
///
/// Tests the collector-side flow using mocked API services:
///   Receive assignment (WS) → Accept → Start → Complete (with proof)
/// Also tests WebSocket real-time updates on the collector side.
import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:dio/dio.dart';
import 'package:wastewise/models/job.dart';
import 'package:wastewise/providers/collector_jobs_provider.dart';
import 'package:wastewise/services/api/jobs_api.dart';
import 'package:wastewise/services/api/files_api.dart';
import 'package:wastewise/services/websocket/websocket_service.dart';
import 'package:wastewise/services/location/location_tracking_service.dart';

class MockJobsApi extends Mock implements JobsApi {}

class MockFilesApi extends Mock implements FilesApi {}

class MockWebSocketService extends Mock implements WebSocketService {}

class MockLocationTrackingService extends Mock implements LocationTrackingService {}

void main() {
  late MockJobsApi mockJobsApi;
  late MockFilesApi mockFilesApi;
  late MockWebSocketService mockWsService;
  late MockLocationTrackingService mockLocationService;
  late CollectorJobsProvider provider;
  late StreamController<JobStatusUpdate> wsStatusController;
  late StreamController<CollectorAssignedEvent> wsAssignedController;

  Job makeCollectorJob({
    String id = 'col-job-1',
    JobStatus status = JobStatus.ASSIGNED,
    String collectorId = 'col-1',
  }) =>
      Job(
        id: id,
        householdId: 'hh-1',
        collectorId: collectorId,
        status: status,
        scheduledDate: '2026-04-25',
        scheduledTime: '10:00',
        locationAddress: '456 Collector Test Ave, Douala',
        locationLat: 4.04,
        locationLng: 9.69,
        createdAt: DateTime(2026, 4, 22),
        updatedAt: DateTime(2026, 4, 22),
      );

  setUp(() {
    mockJobsApi = MockJobsApi();
    mockFilesApi = MockFilesApi();
    mockWsService = MockWebSocketService();
    mockLocationService = MockLocationTrackingService();
    wsStatusController = StreamController<JobStatusUpdate>.broadcast();
    wsAssignedController =
        StreamController<CollectorAssignedEvent>.broadcast();

    when(() => mockWsService.jobStatusStream)
        .thenAnswer((_) => wsStatusController.stream);
    when(() => mockWsService.collectorAssignedStream)
        .thenAnswer((_) => wsAssignedController.stream);
    when(() => mockWsService.subscribeToJob(any())).thenReturn(null);
    when(() => mockWsService.unsubscribeFromJob(any())).thenReturn(null);
    when(() => mockLocationService.dispose()).thenAnswer((_) {});

    provider = CollectorJobsProvider(
      jobsApi: mockJobsApi,
      filesApi: mockFilesApi,
      wsService: mockWsService,
      locationService: mockLocationService,
    );
  });

  setUpAll(() {
    registerFallbackValue(JobStatus.ASSIGNED);
  });

  tearDown(() {
    wsStatusController.close();
    wsAssignedController.close();
    provider.dispose();
  });

  group('Collector Job Lifecycle Integration', () {
    test('Step 1: Collector loads assigned jobs', () async {
      final assignedJob = makeCollectorJob();
      when(() => mockJobsApi.getAssignedJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
            limit: any(named: 'limit'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [assignedJob],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));

      await provider.loadJobs(refresh: true);

      expect(provider.jobs.length, 1);
      expect(provider.assignedJobs.length, 1);
      expect(provider.inProgressJobs.length, 0);
      expect(provider.isLoading, false);
      verify(() => mockWsService.subscribeToJob('col-job-1')).called(1);
    });

    test('Step 2: Collector accepts an assigned job', () async {
      // Load job first
      when(() => mockJobsApi.getAssignedJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
            limit: any(named: 'limit'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [makeCollectorJob()],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));
      await provider.loadJobs(refresh: true);

      // Accept returns ASSIGNED (confirmation only, per spec)
      final acceptedJob = makeCollectorJob(status: JobStatus.ASSIGNED);
      when(() => mockJobsApi.acceptJob('col-job-1'))
          .thenAnswer((_) async => acceptedJob);

      final success = await provider.acceptJob('col-job-1');

      expect(success, true);
      expect(provider.isActioning, false);
    });

    test('Step 3: Collector starts the job', () async {
      when(() => mockJobsApi.getAssignedJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
            limit: any(named: 'limit'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [makeCollectorJob()],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));
      await provider.loadJobs(refresh: true);

      final startedJob =
          makeCollectorJob(status: JobStatus.IN_PROGRESS);
      when(() => mockJobsApi.startJob('col-job-1'))
          .thenAnswer((_) async => startedJob);
      when(() => mockLocationService.startTracking('col-job-1'))
          .thenAnswer((_) async => true);

      final success = await provider.startJob('col-job-1');

      expect(success, true);
      expect(provider.jobs.first.status, JobStatus.IN_PROGRESS);
      expect(provider.inProgressJobs.length, 1);
      verify(() => mockLocationService.startTracking('col-job-1')).called(1);
    });

    test('Step 4: Collector rejects a job', () async {
      when(() => mockJobsApi.getAssignedJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
            limit: any(named: 'limit'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [makeCollectorJob()],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));
      await provider.loadJobs(refresh: true);

      when(() =>
              mockJobsApi.rejectJob('col-job-1', reason: 'Too far'))
          .thenAnswer((_) async => {'message': 'Job rejected'});

      final success =
          await provider.rejectJob('col-job-1', reason: 'Too far');

      expect(success, true);
      expect(provider.jobs.length, 0);
      verify(() => mockWsService.unsubscribeFromJob('col-job-1')).called(1);
    });
  });

  group('Collector WebSocket Updates', () {
    test('receives new job assignment via WS', () async {
      // Initial empty list
      when(() => mockJobsApi.getAssignedJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
            limit: any(named: 'limit'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [],
            page: 1,
            limit: 20,
            total: 0,
            pages: 1,
          ));
      await provider.loadJobs(refresh: true);
      expect(provider.jobs.length, 0);

      // Simulate new assignment event via WS
      // This triggers a refresh of the job list
      when(() => mockJobsApi.getAssignedJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
            limit: any(named: 'limit'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [makeCollectorJob()],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));

      wsAssignedController.add(CollectorAssignedEvent(
        jobId: 'col-job-1',
        status: JobStatus.ASSIGNED,
        householdId: 'hh-1',
        updatedAt: DateTime.now(),
      ));

      // Allow async refresh
      await Future.delayed(const Duration(milliseconds: 100));

      expect(provider.jobs.length, 1);
    });

    test('WS status update changes job in list', () async {
      when(() => mockJobsApi.getAssignedJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
            limit: any(named: 'limit'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [makeCollectorJob()],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));
      await provider.loadJobs(refresh: true);
      expect(provider.jobs.first.status, JobStatus.ASSIGNED);

      // Simulate status update to COMPLETED (e.g., admin force-complete)
      wsStatusController.add(JobStatusUpdate(
        jobId: 'col-job-1',
        status: JobStatus.COMPLETED,
        collectorId: 'col-1',
        updatedAt: DateTime.now(),
      ));
      await Future.delayed(Duration.zero);

      expect(provider.jobs.first.status, JobStatus.COMPLETED);
      expect(provider.completedJobs.length, 1);
    });
  });

  group('Collector Error Handling', () {
    test('accept failure shows error', () async {
      when(() => mockJobsApi.getAssignedJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
            limit: any(named: 'limit'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [makeCollectorJob()],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));
      await provider.loadJobs(refresh: true);

      when(() => mockJobsApi.acceptJob('col-job-1')).thenThrow(DioException(
        requestOptions: RequestOptions(path: '/jobs/col-job-1/accept'),
        response: Response(
          requestOptions: RequestOptions(path: '/jobs/col-job-1/accept'),
          statusCode: 400,
          data: {'message': 'Job is not in ASSIGNED status'},
        ),
      ));

      final success = await provider.acceptJob('col-job-1');

      expect(success, false);
      expect(provider.error, 'Job is not in ASSIGNED status');
      expect(provider.isActioning, false);
    });

    test('load failure shows error', () async {
      when(() => mockJobsApi.getAssignedJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
            limit: any(named: 'limit'),
          )).thenThrow(DioException(
        requestOptions: RequestOptions(path: '/jobs/assigned'),
        type: DioExceptionType.connectionTimeout,
      ));

      await provider.loadJobs(refresh: true);

      expect(provider.error, isNotNull);
      expect(provider.isLoading, false);
    });
  });

  group('Collector Job Filters', () {
    test('filters assigned vs in-progress vs completed correctly', () async {
      final jobs = [
        makeCollectorJob(id: 'j-1', status: JobStatus.ASSIGNED),
        makeCollectorJob(id: 'j-2', status: JobStatus.IN_PROGRESS),
        makeCollectorJob(id: 'j-3', status: JobStatus.COMPLETED),
        makeCollectorJob(id: 'j-4', status: JobStatus.VALIDATED),
      ];

      when(() => mockJobsApi.getAssignedJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
            limit: any(named: 'limit'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: jobs,
            page: 1,
            limit: 20,
            total: 4,
            pages: 1,
          ));
      await provider.loadJobs(refresh: true);

      expect(provider.assignedJobs.length, 1);
      expect(provider.inProgressJobs.length, 1);
      expect(provider.completedJobs.length, 2);
      expect(provider.activeJobs.length, 2);
    });
  });
}
