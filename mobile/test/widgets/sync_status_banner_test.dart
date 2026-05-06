import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:mocktail/mocktail.dart';
import 'package:wastewise/services/offline/offline_queue_service.dart';
import 'package:wastewise/services/offline/connectivity_service.dart';
import 'package:wastewise/services/offline/sync_service.dart';
import 'package:wastewise/providers/offline_queue_provider.dart';
import 'package:wastewise/widgets/sync_status_banner.dart';

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
  });

  tearDown(() {
    connectivityController.close();
    syncStatusController.close();
    syncResultController.close();
  });

  Widget buildWidget(OfflineQueueProvider provider) {
    return ChangeNotifierProvider.value(
      value: provider,
      child: const MaterialApp(
        home: Scaffold(body: SyncStatusBanner()),
      ),
    );
  }

  group('SyncStatusBanner', () {
    testWidgets('shows nothing when online and idle with no pending',
        (tester) async {
      final provider = OfflineQueueProvider(
        queueService: mockQueue,
        connectivityService: mockConnectivity,
        syncService: mockSync,
      );

      await tester.pumpWidget(buildWidget(provider));
      await tester.pumpAndSettle();

      // Should show an empty SizedBox
      expect(find.text('You are offline'), findsNothing);
      expect(find.text('Syncing...'), findsNothing);

      provider.dispose();
    });

    testWidgets('shows offline banner when offline', (tester) async {
      when(() => mockConnectivity.isOnline).thenReturn(false);

      final provider = OfflineQueueProvider(
        queueService: mockQueue,
        connectivityService: mockConnectivity,
        syncService: mockSync,
      );

      await tester.pumpWidget(buildWidget(provider));
      await tester.pumpAndSettle();

      expect(find.text('You are offline'), findsOneWidget);

      provider.dispose();
    });

    testWidgets('shows offline banner with pending count', (tester) async {
      when(() => mockConnectivity.isOnline).thenReturn(false);
      when(() => mockQueue.getPendingCount()).thenAnswer((_) async => 3);

      final provider = OfflineQueueProvider(
        queueService: mockQueue,
        connectivityService: mockConnectivity,
        syncService: mockSync,
      );

      await tester.pumpWidget(buildWidget(provider));
      // Allow pending count to load
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('You are offline'), findsOneWidget);
      expect(find.text('3 action(s) queued'), findsOneWidget);

      provider.dispose();
    });

    testWidgets('shows syncing banner during sync', (tester) async {
      when(() => mockQueue.getPendingCount()).thenAnswer((_) async => 2);

      final provider = OfflineQueueProvider(
        queueService: mockQueue,
        connectivityService: mockConnectivity,
        syncService: mockSync,
      );

      await tester.pumpWidget(buildWidget(provider));
      await tester.pump(const Duration(milliseconds: 50));

      syncStatusController.add(SyncStatus.syncing);
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Syncing...'), findsOneWidget);

      provider.dispose();
    });

    testWidgets('shows completed banner after successful sync',
        (tester) async {
      final provider = OfflineQueueProvider(
        queueService: mockQueue,
        connectivityService: mockConnectivity,
        syncService: mockSync,
      );

      await tester.pumpWidget(buildWidget(provider));
      await tester.pump(const Duration(milliseconds: 50));

      syncStatusController.add(SyncStatus.completed);
      syncResultController
          .add(SyncResult(total: 2, synced: 2, failed: 0));
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Sync complete'), findsOneWidget);
      expect(find.text('2 action(s) synced'), findsOneWidget);

      provider.dispose();
    });

    testWidgets('shows error banner with retry on sync failure',
        (tester) async {
      when(() => mockQueue.getPendingCount()).thenAnswer((_) async => 1);
      when(() => mockSync.retryNow()).thenAnswer((_) async {});

      final provider = OfflineQueueProvider(
        queueService: mockQueue,
        connectivityService: mockConnectivity,
        syncService: mockSync,
      );

      await tester.pumpWidget(buildWidget(provider));
      await tester.pump(const Duration(milliseconds: 50));

      syncStatusController.add(SyncStatus.error);
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Sync failed'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);

      provider.dispose();
    });
  });

  group('OfflineBadge', () {
    testWidgets('shows nothing when no pending items', (tester) async {
      final provider = OfflineQueueProvider(
        queueService: mockQueue,
        connectivityService: mockConnectivity,
        syncService: mockSync,
      );

      await tester.pumpWidget(
        ChangeNotifierProvider.value(
          value: provider,
          child: const MaterialApp(
            home: Scaffold(body: OfflineBadge()),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // No badge text visible
      expect(find.text('0'), findsNothing);

      provider.dispose();
    });
  });
}
