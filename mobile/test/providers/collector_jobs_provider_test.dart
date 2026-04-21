import 'dart:async';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:wastewise/models/job.dart';
import 'package:wastewise/providers/collector_jobs_provider.dart';
import 'package:wastewise/services/api/jobs_api.dart';
import 'package:wastewise/services/api/files_api.dart';
import 'package:wastewise/services/websocket/websocket_service.dart';
import 'package:wastewise/services/location/location_tracking_service.dart';

class MockJobsApi extends Mock implements JobsApi {}

class MockFilesApi extends Mock implements FilesApi {}

class MockWebSocketService extends Mock implements WebSocketService {}

class MockLocationTrackingService extends Mock
    implements LocationTrackingService {}

void main() {
  late MockJobsApi mockJobsApi;
  late MockFilesApi mockFilesApi;
  late MockWebSocketService mockWsService;
  late MockLocationTrackingService mockLocationService;
  late StreamController<JobStatusUpdate> statusController;
  late StreamController<CollectorAssignedEvent> assignedController;
  late CollectorJobsProvider provider;

  final testJob = Job(
    id: 'job-1',
    householdId: 'hh-1',
    householdName: 'Test House',
    collectorId: 'col-1',
    collectorName: 'Test Collector',
    status: JobStatus.ASSIGNED,
    scheduledDate: '2026-04-20',
    scheduledTime: '08:00-10:00',
    locationAddress: '123 Test Street',
    createdAt: DateTime(2026, 4, 15),
    updatedAt: DateTime(2026, 4, 15),
  );

  final inProgressJob = Job(
    id: 'job-1',
    householdId: 'hh-1',
    householdName: 'Test House',
    collectorId: 'col-1',
    collectorName: 'Test Collector',
    status: JobStatus.IN_PROGRESS,
    scheduledDate: '2026-04-20',
    scheduledTime: '08:00-10:00',
    locationAddress: '123 Test Street',
    startedAt: DateTime(2026, 4, 20, 8, 0),
    createdAt: DateTime(2026, 4, 15),
    updatedAt: DateTime(2026, 4, 20),
  );

  setUpAll(() {
    registerFallbackValue(JobStatus.ASSIGNED);
    registerFallbackValue(File('/tmp/test.jpg'));
  });

  setUp(() {
    mockJobsApi = MockJobsApi();
    mockFilesApi = MockFilesApi();
    mockWsService = MockWebSocketService();
    mockLocationService = MockLocationTrackingService();
    statusController = StreamController<JobStatusUpdate>.broadcast();
    assignedController = StreamController<CollectorAssignedEvent>.broadcast();

    when(() => mockWsService.jobStatusStream)
        .thenAnswer((_) => statusController.stream);
    when(() => mockWsService.collectorAssignedStream)
        .thenAnswer((_) => assignedController.stream);
    when(() => mockWsService.subscribeToJob(any())).thenReturn(null);
    when(() => mockWsService.unsubscribeFromJob(any())).thenReturn(null);
    when(() => mockLocationService.activeJobId).thenReturn(null);

    provider = CollectorJobsProvider(
      jobsApi: mockJobsApi,
      filesApi: mockFilesApi,
      wsService: mockWsService,
      locationService: mockLocationService,
    );
  });

  tearDown(() {
    statusController.close();
    assignedController.close();
    provider.dispose();
  });

  group('loadJobs', () {
    test('loads assigned jobs successfully', () async {
      when(() => mockJobsApi.getAssignedJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
            limit: any(named: 'limit'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [testJob],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));

      await provider.loadJobs();

      expect(provider.jobs.length, 1);
      expect(provider.jobs[0].id, 'job-1');
      expect(provider.isLoading, false);
      expect(provider.error, isNull);
    });

    test('sets error on failure', () async {
      when(() => mockJobsApi.getAssignedJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
            limit: any(named: 'limit'),
          )).thenThrow(Exception('Network error'));

      await provider.loadJobs();

      expect(provider.error, isNotNull);
      expect(provider.jobs, isEmpty);
    });
  });

  group('acceptJob', () {
    test('accepts job successfully', () async {
      when(() => mockJobsApi.getAssignedJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
            limit: any(named: 'limit'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [testJob],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));
      when(() => mockJobsApi.acceptJob('job-1'))
          .thenAnswer((_) async => testJob);

      await provider.loadJobs();
      final result = await provider.acceptJob('job-1');

      expect(result, true);
      expect(provider.error, isNull);
      verify(() => mockJobsApi.acceptJob('job-1')).called(1);
    });

    test('returns false on error', () async {
      when(() => mockJobsApi.acceptJob('job-1'))
          .thenThrow(Exception('Already accepted'));

      final result = await provider.acceptJob('job-1');

      expect(result, false);
      expect(provider.error, isNotNull);
    });
  });

  group('rejectJob', () {
    test('rejects job and removes from list', () async {
      when(() => mockJobsApi.getAssignedJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
            limit: any(named: 'limit'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [testJob],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));
      when(() => mockJobsApi.rejectJob('job-1', reason: any(named: 'reason')))
          .thenAnswer((_) async => {'message': 'Job rejected'});

      await provider.loadJobs();
      expect(provider.jobs.length, 1);

      final result = await provider.rejectJob('job-1', reason: 'Too far');

      expect(result, true);
      expect(provider.jobs, isEmpty);
      verify(() => mockWsService.unsubscribeFromJob('job-1')).called(1);
    });

    test('returns false on error', () async {
      when(() => mockJobsApi.rejectJob('job-1', reason: any(named: 'reason')))
          .thenThrow(Exception('Not assigned'));

      final result = await provider.rejectJob('job-1');

      expect(result, false);
      expect(provider.error, isNotNull);
    });
  });

  group('startJob', () {
    test('starts job and enables location tracking', () async {
      when(() => mockJobsApi.getAssignedJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
            limit: any(named: 'limit'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [testJob],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));
      when(() => mockJobsApi.startJob('job-1'))
          .thenAnswer((_) async => inProgressJob);
      when(() => mockLocationService.startTracking('job-1'))
          .thenAnswer((_) async => true);

      await provider.loadJobs();
      final result = await provider.startJob('job-1');

      expect(result, true);
      expect(provider.jobs[0].status, JobStatus.IN_PROGRESS);
      verify(() => mockLocationService.startTracking('job-1')).called(1);
    });
  });

  group('completeJob', () {
    test('uploads proof and completes job', () async {
      final testFile = File('/tmp/proof.jpg');
      final completedJob = Job(
        id: 'job-1',
        householdId: 'hh-1',
        collectorId: 'col-1',
        status: JobStatus.COMPLETED,
        scheduledDate: '2026-04-20',
        scheduledTime: '08:00-10:00',
        locationAddress: '123 Test Street',
        completedAt: DateTime(2026, 4, 20, 9, 30),
        createdAt: DateTime(2026, 4, 15),
        updatedAt: DateTime(2026, 4, 20),
      );

      when(() => mockJobsApi.getAssignedJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
            limit: any(named: 'limit'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [inProgressJob],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));
      when(() => mockFilesApi.uploadProofImage(any()))
          .thenAnswer((_) async => FileUploadResult(
                fileKey: 'key-1',
                fileUrl: 'https://cdn.example.com/proof.jpg',
              ));
      when(() => mockJobsApi.completeJob(
            'job-1',
            proofImageUrl: any(named: 'proofImageUrl'),
            collectorLat: any(named: 'collectorLat'),
            collectorLng: any(named: 'collectorLng'),
          )).thenAnswer((_) async => completedJob);
      when(() => mockLocationService.stopTracking()).thenReturn(null);

      await provider.loadJobs();
      final result = await provider.completeJob('job-1', proofImage: testFile);

      expect(result, true);
      expect(provider.jobs[0].status, JobStatus.COMPLETED);
      verify(() => mockFilesApi.uploadProofImage(any())).called(1);
      verify(() => mockLocationService.stopTracking()).called(1);
    });
  });

  group('WebSocket updates', () {
    test('updates job status on WebSocket event', () async {
      when(() => mockJobsApi.getAssignedJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
            limit: any(named: 'limit'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [testJob],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));

      await provider.loadJobs();
      expect(provider.jobs[0].status, JobStatus.ASSIGNED);

      statusController.add(JobStatusUpdate(
        jobId: 'job-1',
        status: JobStatus.IN_PROGRESS,
        updatedAt: DateTime.now(),
      ));

      await Future.delayed(const Duration(milliseconds: 50));

      expect(provider.jobs[0].status, JobStatus.IN_PROGRESS);
    });

    test('stops location tracking when job leaves IN_PROGRESS', () async {
      when(() => mockJobsApi.getAssignedJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
            limit: any(named: 'limit'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [inProgressJob],
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          ));
      when(() => mockLocationService.activeJobId).thenReturn('job-1');
      when(() => mockLocationService.stopTracking()).thenReturn(null);

      await provider.loadJobs();

      statusController.add(JobStatusUpdate(
        jobId: 'job-1',
        status: JobStatus.COMPLETED,
        updatedAt: DateTime.now(),
      ));

      await Future.delayed(const Duration(milliseconds: 50));

      verify(() => mockLocationService.stopTracking()).called(1);
    });
  });

  group('filtered lists', () {
    test('assignedJobs filters correctly', () async {
      final job2 = Job(
        id: 'job-2',
        householdId: 'hh-2',
        collectorId: 'col-1',
        status: JobStatus.IN_PROGRESS,
        scheduledDate: '2026-04-21',
        scheduledTime: '10:00-12:00',
        locationAddress: '456 Other St',
        createdAt: DateTime(2026, 4, 16),
        updatedAt: DateTime(2026, 4, 16),
      );

      when(() => mockJobsApi.getAssignedJobs(
            status: any(named: 'status'),
            page: any(named: 'page'),
            limit: any(named: 'limit'),
          )).thenAnswer((_) async => PaginatedJobs(
            data: [testJob, job2],
            page: 1,
            limit: 20,
            total: 2,
            pages: 1,
          ));

      await provider.loadJobs();

      expect(provider.assignedJobs.length, 1);
      expect(provider.inProgressJobs.length, 1);
      expect(provider.activeJobs.length, 2);
    });
  });
}
