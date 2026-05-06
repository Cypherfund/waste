import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:wastewise/services/offline/offline_queue_service.dart';
import 'package:wastewise/services/offline/connectivity_service.dart';
import 'package:wastewise/services/offline/sync_service.dart';
import 'package:wastewise/providers/offline_queue_provider.dart';

class MockOfflineQueueService extends Mock implements OfflineQueueService {}

class MockConnectivityService extends Mock implements ConnectivityService {}

class MockSyncService extends Mock implements SyncService {}

void main() {
  late MockOfflineQueueService mockQueue;
  late MockConnectivityService mockConnectivity;
  late MockSyncService mockSync;
  late StreamController<bool> connectivityController;
  late StreamController<SyncStatus> syncStatusController;
  late StreamController<SyncResult> syncResultController;
  late OfflineQueueProvider provider;

  setUp(() {
    mockQueue = MockOfflineQueueService();
    mockConnectivity = MockConnectivityService();
    mockSync = MockSyncService();
    connectivityController = StreamController<bool>.broadcast();
    syncStatusController = StreamController<SyncStatus>.broadcast();
    syncResultController = StreamController<SyncResult>.broadcast();

    when(() => mockConnectivity.isOnline).thenReturn(true);
    when(() => mockConnectivity.onConnectivityChanged)
        .thenAnswer((_) => connectivityController.stream);
    when(() => mockSync.statusStream)
        .thenAnswer((_) => syncStatusController.stream);
    when(() => mockSync.resultStream)
        .thenAnswer((_) => syncResultController.stream);
    when(() => mockQueue.isSupported).thenReturn(true);
    when(() => mockQueue.getPendingCount()).thenAnswer((_) async => 0);
    when(() => mockQueue.getAllItems()).thenAnswer((_) async => []);

    provider = OfflineQueueProvider(
      queueService: mockQueue,
      connectivityService: mockConnectivity,
      syncService: mockSync,
    );
  });

  tearDown(() {
    connectivityController.close();
    syncStatusController.close();
    syncResultController.close();
    provider.dispose();
  });

  group('initial state', () {
    test('starts online with no pending items', () {
      expect(provider.isOnline, true);
      expect(provider.pendingCount, 0);
      expect(provider.hasPendingItems, false);
      expect(provider.syncStatus, SyncStatus.idle);
      expect(provider.error, isNull);
    });
  });

  group('connectivity changes', () {
    test('updates isOnline when connectivity changes', () async {
      connectivityController.add(false);
      await Future.delayed(const Duration(milliseconds: 50));
      expect(provider.isOnline, false);

      connectivityController.add(true);
      await Future.delayed(const Duration(milliseconds: 50));
      expect(provider.isOnline, true);
    });
  });

  group('sync status changes', () {
    test('updates syncStatus on sync events', () async {
      syncStatusController.add(SyncStatus.syncing);
      await Future.delayed(const Duration(milliseconds: 50));
      expect(provider.syncStatus, SyncStatus.syncing);
      expect(provider.isSyncing, true);

      syncStatusController.add(SyncStatus.completed);
      await Future.delayed(const Duration(milliseconds: 50));
      expect(provider.syncStatus, SyncStatus.completed);
      expect(provider.isSyncing, false);
    });

    test('updates lastResult on sync result', () async {
      final result = SyncResult(total: 3, synced: 2, failed: 1, errors: ['err']);
      syncResultController.add(result);
      await Future.delayed(const Duration(milliseconds: 50));

      expect(provider.lastResult, isNotNull);
      expect(provider.lastResult!.total, 3);
      expect(provider.lastResult!.synced, 2);
      expect(provider.lastResult!.failed, 1);
    });
  });

  group('enqueueCreateJob', () {
    test('enqueues create job action', () async {
      final queuedItem = QueuedItem(
        id: 'q-1',
        action: QueueAction.CREATE_JOB,
        data: {'scheduledDate': '2026-04-20'},
        status: QueueStatus.PENDING,
        createdAt: DateTime(2026, 4, 20),
        updatedAt: DateTime(2026, 4, 20),
      );

      when(() => mockQueue.enqueue(
            action: QueueAction.CREATE_JOB,
            data: any(named: 'data'),
          )).thenAnswer((_) async => queuedItem);
      when(() => mockQueue.getPendingCount()).thenAnswer((_) async => 1);

      final item = await provider.enqueueCreateJob(
        scheduledDate: '2026-04-20',
        scheduledTime: '08:00-10:00',
        locationAddress: '123 Test St',
      );

      expect(item.id, 'q-1');
      expect(item.action, QueueAction.CREATE_JOB);
      verify(() => mockQueue.enqueue(
            action: QueueAction.CREATE_JOB,
            data: any(named: 'data'),
          )).called(1);
    });
  });

  group('enqueueCompleteJob', () {
    test('enqueues complete job action', () async {
      final queuedItem = QueuedItem(
        id: 'q-2',
        action: QueueAction.COMPLETE_JOB,
        jobId: 'job-123',
        data: {'proofImageUrl': 'https://cdn.example.com/proof.jpg'},
        status: QueueStatus.PENDING,
        createdAt: DateTime(2026, 4, 20),
        updatedAt: DateTime(2026, 4, 20),
      );

      when(() => mockQueue.enqueue(
            action: QueueAction.COMPLETE_JOB,
            jobId: 'job-123',
            data: any(named: 'data'),
          )).thenAnswer((_) async => queuedItem);
      when(() => mockQueue.getPendingCount()).thenAnswer((_) async => 1);

      final item = await provider.enqueueCompleteJob(
        jobId: 'job-123',
        proofImageUrl: 'https://cdn.example.com/proof.jpg',
      );

      expect(item.action, QueueAction.COMPLETE_JOB);
      expect(item.jobId, 'job-123');
    });
  });

  group('enqueueRateJob', () {
    test('enqueues rate job action', () async {
      final queuedItem = QueuedItem(
        id: 'q-3',
        action: QueueAction.RATE_JOB,
        jobId: 'job-456',
        data: {'value': 5, 'comment': 'Great'},
        status: QueueStatus.PENDING,
        createdAt: DateTime(2026, 4, 20),
        updatedAt: DateTime(2026, 4, 20),
      );

      when(() => mockQueue.enqueue(
            action: QueueAction.RATE_JOB,
            jobId: 'job-456',
            data: any(named: 'data'),
          )).thenAnswer((_) async => queuedItem);
      when(() => mockQueue.getPendingCount()).thenAnswer((_) async => 1);

      final item = await provider.enqueueRateJob(
        jobId: 'job-456',
        value: 5,
        comment: 'Great',
      );

      expect(item.action, QueueAction.RATE_JOB);
      expect(item.jobId, 'job-456');
    });
  });

  group('triggerSync', () {
    test('calls syncService.syncPendingItems', () async {
      when(() => mockSync.syncPendingItems())
          .thenAnswer((_) async => SyncResult(total: 0, synced: 0, failed: 0));

      await provider.triggerSync();

      verify(() => mockSync.syncPendingItems()).called(1);
    });
  });

  group('retrySync', () {
    test('calls syncService.retryNow', () async {
      when(() => mockSync.retryNow())
          .thenAnswer((_) async {});

      await provider.retrySync();

      verify(() => mockSync.retryNow()).called(1);
    });
  });

  group('clearSynced', () {
    test('clears synced items and refreshes', () async {
      when(() => mockQueue.clearSynced()).thenAnswer((_) async {});
      when(() => mockQueue.getAllItems()).thenAnswer((_) async => []);
      when(() => mockQueue.getPendingCount()).thenAnswer((_) async => 0);

      await provider.clearSynced();

      verify(() => mockQueue.clearSynced()).called(1);
      verify(() => mockQueue.getAllItems()).called(1);
    });
  });
}
