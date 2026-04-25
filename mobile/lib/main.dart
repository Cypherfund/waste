import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/app_theme.dart';
import 'features/onboarding/onboarding_flow.dart';
import 'providers/auth_provider.dart';
import 'providers/job_provider.dart';
import 'providers/collector_jobs_provider.dart';
import 'providers/collector_earnings_provider.dart';
import 'providers/offline_queue_provider.dart';
import 'services/api/api_client.dart';
import 'services/api/auth_api.dart';
import 'services/api/job_api.dart';
import 'services/api/files_api.dart';
import 'services/api/earnings_api.dart';
import 'services/storage/secure_storage.dart';
import 'services/websocket/websocket_service.dart';
import 'services/location/location_tracking_service.dart';
import 'services/offline/offline_queue_service.dart';
import 'services/offline/sync_service.dart';
import 'services/offline/connectivity_service.dart';
import 'screens/home/home_screen.dart';
import 'screens/collector/collector_home_screen.dart';
import 'screens/auth/login_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  final onboardingCompleted = await isOnboardingCompleted();
  final connectivityService = ConnectivityService();
  await connectivityService.initialize();

  runApp(WasteWiseApp(
    onboardingCompleted: onboardingCompleted,
    connectivityService: connectivityService,
  ));
}

class WasteWiseApp extends StatefulWidget {
  final bool onboardingCompleted;
  final ConnectivityService connectivityService;

  const WasteWiseApp({
    super.key,
    required this.onboardingCompleted,
    required this.connectivityService,
  });

  @override
  State<WasteWiseApp> createState() => _WasteWiseAppState();
}

class _WasteWiseAppState extends State<WasteWiseApp> {
  late bool _onboardingCompleted;
  late final SecureStorageService _storage;
  late final ApiClient _apiClient;
  late final AuthApi _authApi;
  late final JobApi _jobApi;
  late final FilesApi _filesApi;
  late final EarningsApi _earningsApi;
  late final WebSocketService _wsService;
  late final LocationTrackingService _locationService;
  late final OfflineQueueService _queueService;
  late final SyncService _syncService;
  late final AuthProvider _authProvider;
  late final JobProvider _jobProvider;
  late final CollectorJobsProvider _collectorJobsProvider;
  late final CollectorEarningsProvider _collectorEarningsProvider;
  late final OfflineQueueProvider _offlineQueueProvider;

  @override
  void initState() {
    super.initState();
    _onboardingCompleted = widget.onboardingCompleted;
    _storage = SecureStorageService();
    _apiClient = ApiClient(storage: _storage);
    _authApi = AuthApi(_apiClient);
    _jobApi = JobApi(_apiClient);
    _filesApi = FilesApi(_apiClient);
    _earningsApi = EarningsApi(_apiClient);
    _wsService = WebSocketService();
    _locationService = LocationTrackingService(wsService: _wsService);
    _queueService = OfflineQueueService();

    _syncService = SyncService(
      queueService: _queueService,
      connectivityService: widget.connectivityService,
      jobApi: _jobApi,
    );

    _authProvider = AuthProvider(
      authApi: _authApi,
      storage: _storage,
      wsService: _wsService,
    );

    _jobProvider = JobProvider(
      jobApi: _jobApi,
      syncService: _syncService,
      wsService: _wsService,
    );

    _collectorJobsProvider = CollectorJobsProvider(
      jobApi: _jobApi,
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

    _syncService.initialize();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: _authProvider),
        ChangeNotifierProvider.value(value: _jobProvider),
        ChangeNotifierProvider.value(value: _collectorJobsProvider),
        ChangeNotifierProvider.value(value: _collectorEarningsProvider),
        ChangeNotifierProvider.value(value: _offlineQueueProvider),
        Provider.value(value: widget.connectivityService),
        Provider.value(value: _locationService),
        Provider.value(value: _queueService),
        Provider.value(value: _syncService),
      ],
      child: MaterialApp(
        title: 'WasteWise',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        home: _onboardingCompleted
            ? Consumer<AuthProvider>(
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
              )
            : OnboardingFlow(
                onComplete: () {
                  setState(() => _onboardingCompleted = true);
                },
                onLogin: () {
                  setState(() => _onboardingCompleted = true);
                  markOnboardingCompleted();
                },
              ),
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
        child: CircularProgressIndicator(),
      ),
    );
  }
}
