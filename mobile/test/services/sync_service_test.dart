import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:wastewise/models/job.dart';
import 'package:wastewise/models/rating.dart';
import 'package:wastewise/services/offline/offline_queue_service.dart';
import 'package:wastewise/services/offline/connectivity_service.dart';
import 'package:wastewise/services/offline/sync_service.dart';
import 'package:wastewise/services/api/job_api.dart';

class MockOfflineQueueService extends Mock implements OfflineQueueService {}

class MockConnectivityService extends Mock implements ConnectivityService {}

class MockJobApi extends Mock implements JobApi {}

void main() {
  late MockOfflineQueueService mockQueue;
  late MockConnectivityService mockConnectivity;
  late MockJobApi mockJobApi;
  late SyncService syncService;
  late StreamController<bool> connectivityController;

  final createJobItem = QueuedItem(
    id: 'q-1',
    action: QueueAction.CREATE_JOB,
    data: {
      'scheduledDate': '2026-04-20',
      'scheduledTime': '08:00-10:00',
      'locationAddress': '123 Test St',
    },
    status: QueueStatus.PENDING,
    createdAt: DateTime(2026, 4, 20),
    updatedAt: DateTime(2026, 4, 20),
  );

  final rateJobItem = QueuedItem(
    id: 'q-2',
    action: QueueAction.RATE_JOB,
    jobId: 'job-123',
    data: {'value': 5, 'comment': 'Great'},
    status: QueueStatus.PENDING,
    createdAt: DateTime(2026, 4, 20, 10),
    updatedAt: DateTime(2026, 4, 20, 10),
  );

  final completeJobItem = QueuedItem(
    id: 'q-3',
    action: QueueAction.COMPLETE_JOB,
    jobId: 'job-456',
    data: {'proofImageUrl': 'https://cdn.example.com/proof.jpg'},
    status: QueueStatus.PENDING,
    createdAt: DateTime(2026, 4, 20, 11),
    updatedAt: DateTime(2026, 4, 20, 11),
  );

  setUp(() {
    mockQueue = MockOfflineQueueService();
    mockConnectivity = MockConnectivityService();
    mockJobApi = MockJobApi();
    connectivityController = StreamController<bool>.broadcast();

    when(() => mockConnectivity.onConnectivityChanged)
        .thenAnswer((_) => connectivityController.stream);
    when(() => mockConnectivity.isOnline).thenReturn(true);
    when(() => mockQueue.isSupported).thenReturn(true);

    syncService = SyncService(
      queueService: mockQueue,
      connectivityService: mockConnectivity,
      jobApi: mockJobApi,
    );
  });

  tearDown(() {
    connectivityController.close();
    syncService.dispose();
  });

  group('syncPendingItems', () {
    test('syncs CREATE_JOB items successfully', () async {
      when(() => mockQueue.getPendingItems())
          .thenAnswer((_) async => [createJobItem]);
      when(() => mockQueue.markSyncing(any())).thenAnswer((_) async {});
      when(() => mockQueue.markSynced(any())).thenAnswer((_) async {});
      when(() => mockQueue.clearSynced()).thenAnswer((_) async {});
      when(() => mockJobApi.createJob(
            scheduledDate: '2026-04-20',
            scheduledTime: '08:00-10:00',
            locationAddress: '123 Test St',
            locationLat: null,
            locationLng: null,
            notes: null,
          )).thenAnswer((_) async => _fakeJob());

      final result = await syncService.syncPendingItems();

      expect(result.total, 1);
      expect(result.synced, 1);
      expect(result.failed, 0);
      verify(() => mockQueue.markSyncing('q-1')).called(1);
      verify(() => mockQueue.markSynced('q-1')).called(1);
    });

    test('syncs RATE_JOB items successfully', () async {
      when(() => mockQueue.getPendingItems())
          .thenAnswer((_) async => [rateJobItem]);
      when(() => mockQueue.markSyncing(any())).thenAnswer((_) async {});
      when(() => mockQueue.markSynced(any())).thenAnswer((_) async {});
      when(() => mockQueue.clearSynced()).thenAnswer((_) async {});
      when(() => mockJobApi.rateJob(
            'job-123',
            rating: 5,
            comment: 'Great',
          )).thenAnswer((_) async => _fakeRating());

      final result = await syncService.syncPendingItems();

      expect(result.synced, 1);
      verify(() => mockJobApi.rateJob('job-123', rating: 5, comment: 'Great'))
          .called(1);
    });

    test('syncs COMPLETE_JOB items successfully', () async {
      when(() => mockQueue.getPendingItems())
          .thenAnswer((_) async => [completeJobItem]);
      when(() => mockQueue.markSyncing(any())).thenAnswer((_) async {});
      when(() => mockQueue.markSynced(any())).thenAnswer((_) async {});
      when(() => mockQueue.clearSynced()).thenAnswer((_) async {});
      when(() => mockJobApi.completeJob(
            'job-456',
            proofImageUrl: 'https://cdn.example.com/proof.jpg',
            collectorLat: null,
            collectorLng: null,
          )).thenAnswer((_) async => _fakeJob());

      final result = await syncService.syncPendingItems();

      expect(result.synced, 1);
    });

    test('marks items as failed on API error', () async {
      when(() => mockQueue.getPendingItems())
          .thenAnswer((_) async => [createJobItem]);
      when(() => mockQueue.markSyncing(any())).thenAnswer((_) async {});
      when(() => mockQueue.markFailed(any(), any()))
          .thenAnswer((_) async {});
      when(() => mockJobApi.createJob(
            scheduledDate: any(named: 'scheduledDate'),
            scheduledTime: any(named: 'scheduledTime'),
            locationAddress: any(named: 'locationAddress'),
            locationLat: any(named: 'locationLat'),
            locationLng: any(named: 'locationLng'),
            notes: any(named: 'notes'),
          )).thenThrow(Exception('Server error'));

      final result = await syncService.syncPendingItems();

      expect(result.total, 1);
      expect(result.synced, 0);
      expect(result.failed, 1);
      expect(result.errors.length, 1);
      verify(() => mockQueue.markFailed('q-1', any())).called(1);
    });

    test('handles multiple items with mixed results', () async {
      when(() => mockQueue.getPendingItems())
          .thenAnswer((_) async => [createJobItem, rateJobItem]);
      when(() => mockQueue.markSyncing(any())).thenAnswer((_) async {});
      when(() => mockQueue.markSynced(any())).thenAnswer((_) async {});
      when(() => mockQueue.markFailed(any(), any()))
          .thenAnswer((_) async {});
      when(() => mockQueue.clearSynced()).thenAnswer((_) async {});
      when(() => mockJobApi.createJob(
            scheduledDate: any(named: 'scheduledDate'),
            scheduledTime: any(named: 'scheduledTime'),
            locationAddress: any(named: 'locationAddress'),
            locationLat: any(named: 'locationLat'),
            locationLng: any(named: 'locationLng'),
            notes: any(named: 'notes'),
          )).thenAnswer((_) async => _fakeJob());
      when(() => mockJobApi.rateJob(
            any(),
            rating: any(named: 'rating'),
            comment: any(named: 'comment'),
          )).thenThrow(Exception('Rate failed'));


      final result = await syncService.syncPendingItems();

      expect(result.total, 2);
      expect(result.synced, 1);
      expect(result.failed, 1);
    });

    test('returns empty result when no pending items', () async {
      when(() => mockQueue.getPendingItems()).thenAnswer((_) async => []);

      final result = await syncService.syncPendingItems();

      expect(result.total, 0);
      expect(result.synced, 0);
      expect(result.failed, 0);
    });

    test('skips sync when offline', () async {
      when(() => mockConnectivity.isOnline).thenReturn(false);

      final result = await syncService.syncPendingItems();

      expect(result.total, 0);
      verifyNever(() => mockQueue.getPendingItems());
    });

    test('does not run concurrently', () async {
      when(() => mockQueue.getPendingItems())
          .thenAnswer((_) async {
        await Future.delayed(const Duration(milliseconds: 100));
        return [createJobItem];
      });
      when(() => mockQueue.markSyncing(any())).thenAnswer((_) async {});
      when(() => mockQueue.markSynced(any())).thenAnswer((_) async {});
      when(() => mockQueue.clearSynced()).thenAnswer((_) async {});
      when(() => mockJobApi.createJob(
            scheduledDate: any(named: 'scheduledDate'),
            scheduledTime: any(named: 'scheduledTime'),
            locationAddress: any(named: 'locationAddress'),
            locationLat: any(named: 'locationLat'),
            locationLng: any(named: 'locationLng'),
            notes: any(named: 'notes'),
          )).thenAnswer((_) async => _fakeJob());

      // Start two syncs simultaneously
      final future1 = syncService.syncPendingItems();
      final future2 = syncService.syncPendingItems();

      final results = await Future.wait([future1, future2]);

      // Second call should return empty since first is running
      expect(results[1].total, 0);
    });
  });

  group('status stream', () {
    test('emits syncing then completed on success', () async {
      when(() => mockQueue.getPendingItems())
          .thenAnswer((_) async => [createJobItem]);
      when(() => mockQueue.markSyncing(any())).thenAnswer((_) async {});
      when(() => mockQueue.markSynced(any())).thenAnswer((_) async {});
      when(() => mockQueue.clearSynced()).thenAnswer((_) async {});
      when(() => mockJobApi.createJob(
            scheduledDate: any(named: 'scheduledDate'),
            scheduledTime: any(named: 'scheduledTime'),
            locationAddress: any(named: 'locationAddress'),
            locationLat: any(named: 'locationLat'),
            locationLng: any(named: 'locationLng'),
            notes: any(named: 'notes'),
          )).thenAnswer((_) async => _fakeJob());

      final statuses = <SyncStatus>[];
      syncService.statusStream.listen(statuses.add);

      await syncService.syncPendingItems();
      await Future.delayed(const Duration(milliseconds: 50));

      expect(statuses, contains(SyncStatus.syncing));
      expect(statuses, contains(SyncStatus.completed));
    });

    test('emits error on failure', () async {
      when(() => mockQueue.getPendingItems())
          .thenAnswer((_) async => [createJobItem]);
      when(() => mockQueue.markSyncing(any())).thenAnswer((_) async {});
      when(() => mockQueue.markFailed(any(), any()))
          .thenAnswer((_) async {});
      when(() => mockJobApi.createJob(
            scheduledDate: any(named: 'scheduledDate'),
            scheduledTime: any(named: 'scheduledTime'),
            locationAddress: any(named: 'locationAddress'),
            locationLat: any(named: 'locationLat'),
            locationLng: any(named: 'locationLng'),
            notes: any(named: 'notes'),
          )).thenThrow(Exception('Error'));

      final statuses = <SyncStatus>[];
      syncService.statusStream.listen(statuses.add);

      await syncService.syncPendingItems();
      await Future.delayed(const Duration(milliseconds: 50));

      expect(statuses, contains(SyncStatus.syncing));
      expect(statuses, contains(SyncStatus.error));
    });
  });

  group('retryNow', () {
    test('resets failed items and syncs', () async {
      when(() => mockQueue.resetFailed()).thenAnswer((_) async {});
      when(() => mockQueue.getPendingItems()).thenAnswer((_) async => []);

      await syncService.retryNow();

      verify(() => mockQueue.resetFailed()).called(1);
      verify(() => mockQueue.getPendingItems()).called(1);
    });
  });
}

Job _fakeJob() {
  return Job(
    id: 'job-new',
    householdId: 'hh-1',
    status: JobStatus.requested,
    scheduledDate: '2026-04-20',
    scheduledTime: '08:00-10:00',
    locationAddress: '123 Test St',
    createdAt: DateTime(2026, 4, 20),
    updatedAt: DateTime(2026, 4, 20),
  );
}

Rating _fakeRating() {
  return Rating(
    id: 'rating-1',
    jobId: 'job-123',
    householdId: 'hh-1',
    collectorId: 'col-1',
    value: 5,
    comment: 'Great',
    createdAt: DateTime(2026, 4, 20),
  );
}
