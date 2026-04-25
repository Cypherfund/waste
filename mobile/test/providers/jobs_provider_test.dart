import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:dio/dio.dart';
import 'package:wastewise/models/job.dart';
import 'package:wastewise/models/rating.dart';
import 'package:wastewise/providers/jobs_provider.dart';
import 'package:wastewise/services/api/job_api.dart';
import 'package:wastewise/services/websocket/websocket_service.dart';

class MockJobApi extends Mock implements JobApi {}

class MockWebSocketService extends Mock implements WebSocketService {}

void main() {
  late MockJobApi mockJobApi;
  late MockWebSocketService mockWsService;
  late JobsProvider provider;
  late StreamController<JobStatusUpdate> wsStreamController;

  final testJob = Job(
    id: 'job-1',
    householdId: 'hh-1',
    status: JobStatus.requested,
    scheduledDate: '2026-04-25',
    scheduledTime: '08:00-10:00',
    locationAddress: 'Test Address',
    createdAt: DateTime(2026, 4, 20),
    updatedAt: DateTime(2026, 4, 20),
  );

  setUp(() {
    mockJobApi = MockJobApi();
    mockWsService = MockWebSocketService();
    wsStreamController = StreamController<JobStatusUpdate>.broadcast();

    when(() => mockWsService.jobStatusStream)
        .thenAnswer((_) => wsStreamController.stream);
    when(() => mockWsService.subscribeToJob(any())).thenReturn(null);

    provider = JobsProvider(
      jobsApi: mockJobApi,
      wsService: mockWsService,
    );
  });

  tearDown(() {
    wsStreamController.close();
    provider.dispose();
  });

  group('JobsProvider', () {
    group('loadJobs', () {
      test('loads jobs successfully', () async {
        when(() => mockJobApi.getMyJobs(
              status: any(named: 'status'),
              page: any(named: 'page'),
            )).thenAnswer((_) async => PaginatedJobs(
              data: [testJob],
              page: 1,
              limit: 20,
              total: 1,
              pages: 1,
            ));

        await provider.loadJobs(refresh: true);

        expect(provider.jobs.length, 1);
        expect(provider.jobs.first.id, 'job-1');
        expect(provider.isLoading, false);
        expect(provider.error, isNull);
      });

      test('sets error on failure', () async {
        when(() => mockJobApi.getMyJobs(
              status: any(named: 'status'),
              page: any(named: 'page'),
            )).thenThrow(DioException(
          requestOptions: RequestOptions(path: '/jobs/mine'),
          type: DioExceptionType.connectionError,
        ));

        await provider.loadJobs(refresh: true);

        expect(provider.jobs, isEmpty);
        expect(provider.error, isNotNull);
        expect(provider.isLoading, false);
      });
    });

    group('createJob', () {
      test('creates job and adds to list', () async {
        when(() => mockJobApi.createJob(
              scheduledDate: any(named: 'scheduledDate'),
              scheduledTime: any(named: 'scheduledTime'),
              locationAddress: any(named: 'locationAddress'),
              locationLat: any(named: 'locationLat'),
              locationLng: any(named: 'locationLng'),
              notes: any(named: 'notes'),
            )).thenAnswer((_) async => testJob);

        final result = await provider.createJob(
          scheduledDate: '2026-04-25',
          scheduledTime: '08:00-10:00',
          locationAddress: 'Test Address',
        );

        expect(result, isNotNull);
        expect(result!.id, 'job-1');
        expect(provider.jobs.length, 1);
        verify(() => mockWsService.subscribeToJob('job-1')).called(1);
      });

      test('returns null and sets error on failure', () async {
        when(() => mockJobApi.createJob(
              scheduledDate: any(named: 'scheduledDate'),
              scheduledTime: any(named: 'scheduledTime'),
              locationAddress: any(named: 'locationAddress'),
              locationLat: any(named: 'locationLat'),
              locationLng: any(named: 'locationLng'),
              notes: any(named: 'notes'),
            )).thenThrow(DioException(
          requestOptions: RequestOptions(path: '/jobs'),
          response: Response(
            requestOptions: RequestOptions(path: '/jobs'),
            statusCode: 409,
            data: {'message': 'Duplicate active job'},
          ),
        ));

        final result = await provider.createJob(
          scheduledDate: '2026-04-25',
          scheduledTime: '08:00-10:00',
          locationAddress: 'Test',
        );

        expect(result, isNull);
        expect(provider.error, 'Duplicate active job');
      });
    });

    group('validateJob', () {
      test('validates job and updates list', () async {
        // First load a job
        when(() => mockJobApi.getMyJobs(
              status: any(named: 'status'),
              page: any(named: 'page'),
            )).thenAnswer((_) async => PaginatedJobs(
              data: [testJob.copyWith(status: JobStatus.completed)],
              page: 1,
              limit: 20,
              total: 1,
              pages: 1,
            ));
        await provider.loadJobs(refresh: true);

        final validatedJob = testJob.copyWith(status: JobStatus.validated);
        when(() => mockJobApi.validateProof('job-1'))
            .thenAnswer((_) async => validatedJob);

        final success = await provider.validateJob('job-1');

        expect(success, true);
        expect(provider.jobs.first.status, JobStatus.validated);
      });

      test('returns false on error', () async {
        when(() => mockJobApi.validateProof('job-1')).thenThrow(DioException(
          requestOptions: RequestOptions(path: '/jobs/job-1/validate'),
          response: Response(
            requestOptions: RequestOptions(path: '/jobs/job-1/validate'),
            statusCode: 400,
            data: {'message': 'Invalid state'},
          ),
        ));

        final success = await provider.validateJob('job-1');

        expect(success, false);
        expect(provider.error, 'Invalid state');
      });
    });

    group('cancelJob', () {
      test('cancels job and updates list', () async {
        when(() => mockJobApi.getMyJobs(
              status: any(named: 'status'),
              page: any(named: 'page'),
            )).thenAnswer((_) async => PaginatedJobs(
              data: [testJob],
              page: 1,
              limit: 20,
              total: 1,
              pages: 1,
            ));
        await provider.loadJobs(refresh: true);

        final cancelledJob = testJob.copyWith(status: JobStatus.cancelled);
        when(() => mockJobApi.cancelJob('job-1', reason: 'No longer needed'))
            .thenAnswer((_) async => cancelledJob);

        final success =
            await provider.cancelJob('job-1', reason: 'No longer needed');

        expect(success, true);
        expect(provider.jobs.first.status, JobStatus.cancelled);
      });
    });

    group('rateJob', () {
      test('rates job and refreshes it', () async {
        final validatedJob = testJob.copyWith(status: JobStatus.validated);
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

        when(() => mockJobApi.rateJob('job-1', rating: 5, comment: 'Great'))
            .thenAnswer((_) async => Rating(
                  id: 'rating-1',
                  jobId: 'job-1',
                  householdId: 'hh-1',
                  collectorId: 'col-1',
                  value: 5,
                  comment: 'Great',
                  createdAt: DateTime.now(),
                ));

        final ratedJob = testJob.copyWith(status: JobStatus.rated);
        when(() => mockJobApi.getJob('job-1'))
            .thenAnswer((_) async => ratedJob);

        final success =
            await provider.rateJob('job-1', value: 5, comment: 'Great');

        expect(success, true);
        expect(provider.jobs.first.status, JobStatus.rated);
      });
    });

    group('WebSocket updates', () {
      test('updates job status on WebSocket event', () async {
        when(() => mockJobApi.getMyJobs(
              status: any(named: 'status'),
              page: any(named: 'page'),
            )).thenAnswer((_) async => PaginatedJobs(
              data: [testJob],
              page: 1,
              limit: 20,
              total: 1,
              pages: 1,
            ));
        await provider.loadJobs(refresh: true);

        expect(provider.jobs.first.status, JobStatus.requested);

        wsStreamController.add(JobStatusUpdate(
          jobId: 'job-1',
          status: JobStatus.assigned,
          collectorId: 'col-1',
          updatedAt: DateTime.now(),
        ));

        // Allow stream to process
        await Future.delayed(Duration.zero);

        expect(provider.jobs.first.status, JobStatus.assigned);
      });

      test('ignores updates for unknown jobs', () async {
        when(() => mockJobApi.getMyJobs(
              status: any(named: 'status'),
              page: any(named: 'page'),
            )).thenAnswer((_) async => PaginatedJobs(
              data: [testJob],
              page: 1,
              limit: 20,
              total: 1,
              pages: 1,
            ));
        await provider.loadJobs(refresh: true);

        wsStreamController.add(JobStatusUpdate(
          jobId: 'unknown-job',
          status: JobStatus.completed,
          updatedAt: DateTime.now(),
        ));

        await Future.delayed(Duration.zero);

        expect(provider.jobs.first.status, JobStatus.requested);
      });
    });

    group('activeJobs / completedJobs', () {
      test('filters correctly', () async {
        final jobs = [
          testJob,
          testJob.copyWith(status: JobStatus.completed),
          testJob.copyWith(status: JobStatus.validated),
          testJob.copyWith(status: JobStatus.cancelled),
        ];
        // Trick: use different IDs
        when(() => mockJobApi.getMyJobs(
              status: any(named: 'status'),
              page: any(named: 'page'),
            )).thenAnswer((_) async => PaginatedJobs(
              data: jobs,
              page: 1,
              limit: 20,
              total: 4,
              pages: 1,
            ));
        await provider.loadJobs(refresh: true);

        expect(provider.activeJobs.length, 1);
        expect(provider.completedJobs.length, 2);
      });
    });
  });
}
