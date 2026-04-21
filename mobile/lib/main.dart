import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/storage/secure_storage.dart';
import 'services/api/api_client.dart';
import 'services/api/auth_api.dart';
import 'services/api/jobs_api.dart';
import 'services/api/files_api.dart';
import 'services/api/earnings_api.dart';
import 'services/websocket/websocket_service.dart';
import 'services/location/location_tracking_service.dart';
import 'services/offline/offline_queue_service.dart';
import 'services/offline/connectivity_service.dart';
import 'services/offline/sync_service.dart';
import 'providers/auth_provider.dart';
import 'providers/jobs_provider.dart';
import 'providers/collector_jobs_provider.dart';
import 'providers/collector_earnings_provider.dart';
import 'providers/offline_queue_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/home/home_screen.dart';
import 'screens/jobs/jobs_list_screen.dart';
import 'screens/jobs/create_job_screen.dart';
import 'screens/jobs/job_detail_screen.dart';
import 'screens/jobs/rate_job_screen.dart';
import 'screens/collector/collector_home_screen.dart';
import 'screens/collector/collector_jobs_list_screen.dart';
import 'screens/collector/collector_job_detail_screen.dart';
import 'screens/collector/collector_earnings_screen.dart';
import 'screens/sync/sync_queue_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final connectivityService = ConnectivityService();
  await connectivityService.initialize();
  runApp(WasteWiseApp(connectivityService: connectivityService));
}

class WasteWiseApp extends StatefulWidget {
  final ConnectivityService connectivityService;

  const WasteWiseApp({super.key, required this.connectivityService});

  @override
  State<WasteWiseApp> createState() => _WasteWiseAppState();
}

class _WasteWiseAppState extends State<WasteWiseApp> {
  late final SecureStorageService _storage;
  late final ApiClient _apiClient;
  late final AuthApi _authApi;
  late final JobsApi _jobsApi;
  late final FilesApi _filesApi;
  late final EarningsApi _earningsApi;
  late final WebSocketService _wsService;
  late final LocationTrackingService _locationService;
  late final OfflineQueueService _queueService;
  late final SyncService _syncService;
  late final AuthProvider _authProvider;
  late final JobsProvider _jobsProvider;
  late final CollectorJobsProvider _collectorJobsProvider;
  late final CollectorEarningsProvider _collectorEarningsProvider;
  late final OfflineQueueProvider _offlineQueueProvider;

  @override
  void initState() {
    super.initState();
    _storage = SecureStorageService();
    _apiClient = ApiClient(storage: _storage);
    _authApi = AuthApi(_apiClient);
    _jobsApi = JobsApi(_apiClient);
    _filesApi = FilesApi(_apiClient);
    _earningsApi = EarningsApi(_apiClient);
    _wsService = WebSocketService();
    _locationService = LocationTrackingService(wsService: _wsService);
    _queueService = OfflineQueueService();

    _syncService = SyncService(
      queueService: _queueService,
      connectivityService: widget.connectivityService,
      jobsApi: _jobsApi,
    );

    _authProvider = AuthProvider(
      authApi: _authApi,
      storage: _storage,
      wsService: _wsService,
    );

    _jobsProvider = JobsProvider(
      jobsApi: _jobsApi,
      wsService: _wsService,
    );

    _collectorJobsProvider = CollectorJobsProvider(
      jobsApi: _jobsApi,
      filesApi: _filesApi,
      wsService: _wsService,
      locationService: _locationService,
    );

    _collectorEarningsProvider = CollectorEarningsProvider(
      earningsApi: _earningsApi,
    );

    _offlineQueueProvider = OfflineQueueProvider(
      queueService: _queueService,
      connectivityService: widget.connectivityService,
      syncService: _syncService,
    );

    _apiClient.onUnauthorized = () {
      _authProvider.logout();
    };

    _authProvider.tryRestoreSession();
    _syncService.initialize();
  }

  @override
  void dispose() {
    _syncService.dispose();
    _locationService.dispose();
    _wsService.dispose();
    widget.connectivityService.dispose();
    _queueService.close();
    _authProvider.dispose();
    _jobsProvider.dispose();
    _collectorJobsProvider.dispose();
    _collectorEarningsProvider.dispose();
    _offlineQueueProvider.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: _authProvider),
        ChangeNotifierProvider.value(value: _jobsProvider),
        ChangeNotifierProvider.value(value: _collectorJobsProvider),
        ChangeNotifierProvider.value(value: _collectorEarningsProvider),
        ChangeNotifierProvider.value(value: _offlineQueueProvider),
      ],
      child: MaterialApp(
        title: 'WasteWise',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF2E7D32),
            brightness: Brightness.light,
          ),
          useMaterial3: true,
          appBarTheme: const AppBarTheme(
            centerTitle: true,
            elevation: 0,
          ),
        ),
        home: Consumer<AuthProvider>(
          builder: (context, auth, _) {
            switch (auth.status) {
              case AuthStatus.unknown:
                return const _SplashScreen();
              case AuthStatus.authenticated:
                if (auth.user?.isCollector == true) {
                  return const CollectorHomeScreen();
                }
                return const HomeScreen();
              case AuthStatus.unauthenticated:
                return const LoginScreen();
            }
          },
        ),
        routes: {
          '/login': (_) => const LoginScreen(),
          '/register': (_) => const RegisterScreen(),
          '/home': (_) => const HomeScreen(),
          '/jobs': (_) => const JobsListScreen(),
          '/create-job': (_) => const CreateJobScreen(),
          '/job-detail': (_) => const JobDetailScreen(),
          '/rate-job': (_) => const RateJobScreen(),
          '/collector-home': (_) => const CollectorHomeScreen(),
          '/collector-jobs': (_) => const CollectorJobsListScreen(),
          '/collector-job-detail': (_) => const CollectorJobDetailScreen(),
          '/collector-earnings': (_) => const CollectorEarningsScreen(),
          '/sync-queue': (_) => const SyncQueueScreen(),
        },
      ),
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.eco, size: 64, color: Color(0xFF2E7D32)),
            SizedBox(height: 16),
            Text(
              'WasteWise',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Color(0xFF2E7D32),
              ),
            ),
            SizedBox(height: 24),
            CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}
