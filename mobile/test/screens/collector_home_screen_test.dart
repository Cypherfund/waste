import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:mocktail/mocktail.dart';
import 'package:wastewise/models/user.dart';
import 'package:wastewise/models/job.dart';
import 'package:wastewise/models/earning.dart';
import 'package:wastewise/providers/auth_provider.dart';
import 'package:wastewise/providers/collector_jobs_provider.dart';
import 'package:wastewise/providers/collector_earnings_provider.dart';
import 'package:wastewise/providers/offline_queue_provider.dart';
import 'package:wastewise/services/api/auth_api.dart';
import 'package:wastewise/services/api/jobs_api.dart';
import 'package:wastewise/services/api/files_api.dart';
import 'package:wastewise/services/api/earnings_api.dart';
import 'package:wastewise/services/storage/secure_storage.dart';
import 'package:wastewise/services/websocket/websocket_service.dart';
import 'package:wastewise/services/location/location_tracking_service.dart';
import 'package:wastewise/services/offline/offline_queue_service.dart';
import 'package:wastewise/services/offline/connectivity_service.dart';
import 'package:wastewise/services/offline/sync_service.dart';
import 'package:wastewise/screens/collector/collector_home_screen.dart';

class MockAuthApi extends Mock implements AuthApi {}

class MockSecureStorage extends Mock implements SecureStorageService {}

class MockWebSocketService extends Mock implements WebSocketService {}

class MockJobsApi extends Mock implements JobsApi {}

class MockFilesApi extends Mock implements FilesApi {}

class MockEarningsApi extends Mock implements EarningsApi {}

class MockLocationTrackingService extends Mock
    implements LocationTrackingService {}

class MockOfflineQueueService extends Mock implements OfflineQueueService {}

class MockConnectivityService extends Mock implements ConnectivityService {}

class MockSyncService extends Mock implements SyncService {}

void main() {
  late AuthProvider authProvider;
  late CollectorJobsProvider jobsProvider;
  late CollectorEarningsProvider earningsProvider;
  late MockAuthApi mockAuthApi;
  late MockSecureStorage mockStorage;
  late MockWebSocketService mockWsService;
  late MockJobsApi mockJobsApi;
  late MockFilesApi mockFilesApi;
  late MockEarningsApi mockEarningsApi;
  late MockLocationTrackingService mockLocationService;
  late StreamController<JobStatusUpdate> statusController;
  late StreamController<CollectorAssignedEvent> assignedController;
  late OfflineQueueProvider offlineQueueProvider;
  late MockOfflineQueueService mockQueueService;
  late MockConnectivityService mockConnectivityService;
  late MockSyncService mockSyncService;
  late StreamController<bool> connectivityStreamController;
  late StreamController<SyncStatus> syncStatusController;
  late StreamController<SyncResult> syncResultController;

  final testUser = User(
    id: 'col-1',
    name: 'Test Collector',
    phone: '+237670000001',
    role: 'COLLECTOR',
    isActive: true,
    createdAt: DateTime(2026, 1, 1),
  );

  final testJob = Job(
    id: 'job-1',
    householdId: 'hh-1',
    householdName: 'Test House',
    collectorId: 'col-1',
    status: JobStatus.ASSIGNED,
    scheduledDate: '2026-04-20',
    scheduledTime: '08:00-10:00',
    locationAddress: '123 Test Street, Douala',
    createdAt: DateTime(2026, 4, 15),
    updatedAt: DateTime(2026, 4, 15),
  );

  setUpAll(() {
    registerFallbackValue(User(
      id: 'fb',
      name: 'Fallback',
      phone: '+237600000000',
      role: 'COLLECTOR',
      isActive: true,
      createdAt: DateTime(2026, 1, 1),
    ));
    registerFallbackValue(JobStatus.ASSIGNED);
  });

  setUp(() {
    mockAuthApi = MockAuthApi();
    mockStorage = MockSecureStorage();
    mockWsService = MockWebSocketService();
    mockJobsApi = MockJobsApi();
    mockFilesApi = MockFilesApi();
    mockEarningsApi = MockEarningsApi();
    mockLocationService = MockLocationTrackingService();
    statusController = StreamController<JobStatusUpdate>.broadcast();
    assignedController = StreamController<CollectorAssignedEvent>.broadcast();

    when(() => mockWsService.jobStatusStream)
        .thenAnswer((_) => statusController.stream);
    when(() => mockWsService.collectorAssignedStream)
        .thenAnswer((_) => assignedController.stream);
    when(() => mockWsService.subscribeToJob(any())).thenReturn(null);
    when(() => mockLocationService.activeJobId).thenReturn(null);

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

    when(() => mockEarningsApi.getEarningsSummary())
        .thenAnswer((_) async => EarningsQuickSummary(
              today: 500,
              thisWeek: 2500,
              thisMonth: 10000,
              allTime: 50000,
            ));

    when(() => mockStorage.getUser()).thenAnswer((_) async => testUser);
    when(() => mockStorage.getAccessToken()).thenAnswer((_) async => 'token');
    when(() => mockWsService.connect(
          accessToken: any(named: 'accessToken'),
          userId: any(named: 'userId'),
          role: any(named: 'role'),
        )).thenReturn(null);

    authProvider = AuthProvider(
      authApi: mockAuthApi,
      storage: mockStorage,
      wsService: mockWsService,
    );

    jobsProvider = CollectorJobsProvider(
      jobsApi: mockJobsApi,
      filesApi: mockFilesApi,
      wsService: mockWsService,
      locationService: mockLocationService,
    );

    earningsProvider = CollectorEarningsProvider(
      earningsApi: mockEarningsApi,
    );

    mockQueueService = MockOfflineQueueService();
    mockConnectivityService = MockConnectivityService();
    mockSyncService = MockSyncService();
    connectivityStreamController = StreamController<bool>.broadcast();
    syncStatusController = StreamController<SyncStatus>.broadcast();
    syncResultController = StreamController<SyncResult>.broadcast();

    when(() => mockConnectivityService.isOnline).thenReturn(true);
    when(() => mockConnectivityService.onConnectivityChanged)
        .thenAnswer((_) => connectivityStreamController.stream);
    when(() => mockSyncService.statusStream)
        .thenAnswer((_) => syncStatusController.stream);
    when(() => mockSyncService.resultStream)
        .thenAnswer((_) => syncResultController.stream);
    when(() => mockQueueService.getPendingCount()).thenAnswer((_) async => 0);
    when(() => mockQueueService.getAllItems()).thenAnswer((_) async => []);

    offlineQueueProvider = OfflineQueueProvider(
      queueService: mockQueueService,
      connectivityService: mockConnectivityService,
      syncService: mockSyncService,
    );
  });

  tearDown(() {
    statusController.close();
    assignedController.close();
    connectivityStreamController.close();
    syncStatusController.close();
    syncResultController.close();
    jobsProvider.dispose();
    offlineQueueProvider.dispose();
  });

  Widget buildTestWidget() {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: authProvider),
        ChangeNotifierProvider.value(value: jobsProvider),
        ChangeNotifierProvider.value(value: earningsProvider),
        ChangeNotifierProvider.value(value: offlineQueueProvider),
      ],
      child: const MaterialApp(home: CollectorHomeScreen()),
    );
  }

  group('CollectorHomeScreen', () {
    testWidgets('renders collector home with greeting', (tester) async {
      await authProvider.tryRestoreSession();
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('WasteWise Collector'), findsOneWidget);
      expect(find.textContaining('Hello'), findsOneWidget);
    });

    testWidgets('displays earnings summary card', (tester) async {
      await authProvider.tryRestoreSession();
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Earnings'), findsWidgets);
      expect(find.textContaining('500 XAF'), findsWidgets);
    });

    testWidgets('displays active jobs section', (tester) async {
      await authProvider.tryRestoreSession();
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Active Jobs'), findsOneWidget);
      expect(find.text('123 Test Street, Douala'), findsOneWidget);
    });

    testWidgets('has bottom navigation bar', (tester) async {
      await authProvider.tryRestoreSession();
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Jobs'), findsOneWidget);
      expect(find.byType(BottomNavigationBar), findsOneWidget);
    });
  });
}
