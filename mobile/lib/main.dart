import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/app_theme.dart';
import 'features/onboarding/onboarding_flow.dart';
import 'providers/auth_provider.dart';
import 'providers/job_provider.dart';
import 'providers/collector_jobs_provider.dart';
import 'providers/collector_earnings_provider.dart';
import 'providers/offline_queue_provider.dart';
import 'models/job.dart';
import 'services/api/api_client.dart';
import 'services/api/auth_api.dart';
import 'services/api/job_api.dart';
import 'services/api/files_api.dart';
import 'services/api/earnings_api.dart';
import 'services/api/subscription_api.dart';
import 'services/api/wallet_api.dart';
import 'services/api/countries_api.dart';
import 'providers/subscription_provider.dart';
import 'providers/countries_provider.dart';
import 'services/storage/secure_storage.dart';
import 'services/websocket/websocket_service.dart';
import 'services/location/location_tracking_service.dart';
import 'services/offline/offline_queue_service.dart';
import 'services/offline/sync_service.dart';
import 'services/offline/connectivity_service.dart';
import 'screens/collector/collector_shell.dart';
import 'screens/collector/collector_cashout_screen.dart';
import 'screens/collector/collector_cashout_success_screen.dart';
import 'screens/collector/collector_start_job_screen.dart';
import 'screens/collector/collector_complete_job_screen.dart';
import 'screens/collector/collector_job_completed_screen.dart';
import 'screens/collector/collector_arrived_screen.dart';
import 'screens/collector/collector_navigate_screen.dart';
import 'screens/collector/collector_job_detail_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'features/household/presentation/screens/home_dashboard_screen.dart';
import 'features/household/presentation/screens/bookings_list_screen.dart';
import 'features/household/presentation/screens/wallet_screen.dart';
import 'features/household/presentation/screens/profile_screen.dart';
import 'features/household/presentation/screens/schedule_pickup_type_screen.dart';
import 'features/household/presentation/screens/schedule_date_time_screen.dart';
import 'features/household/presentation/screens/schedule_location_screen.dart';
import 'features/household/presentation/screens/schedule_review_payment_screen.dart';
import 'features/household/presentation/screens/booking_confirmed_screen.dart';
import 'features/household/presentation/screens/booking_details_screen.dart';
import 'features/household/presentation/screens/job_tracking_screen.dart';
import 'features/household/presentation/screens/transaction_history_screen.dart';
import 'features/household/presentation/screens/notifications_screen.dart';
import 'features/household/presentation/screens/support_screen.dart';
import 'features/household/presentation/screens/payment_methods_screen.dart';
import 'features/household/presentation/screens/addresses_screen.dart';
import 'features/household/presentation/screens/top_up_wallet_screen.dart';
import 'screens/household/subscription_plans_screen.dart';
import 'screens/household/manage_subscription_screen.dart';
import 'features/marketer/data/marketer_api.dart';
import 'features/marketer/providers/marketer_provider.dart';
import 'features/marketer/presentation/marketer_shell.dart';

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
  late final WalletApi _walletApi;
  late final SubscriptionApi _subscriptionApi;
  late final CountriesApi _countriesApi;
  late final CountriesProvider _countriesProvider;
  late final WebSocketService _wsService;
  late final LocationTrackingService _locationService;
  late final OfflineQueueService _queueService;
  late final SyncService _syncService;
  late final AuthProvider _authProvider;
  late final JobProvider _jobProvider;
  late final CollectorJobsProvider _collectorJobsProvider;
  late final CollectorEarningsProvider _collectorEarningsProvider;
  late final SubscriptionProvider _subscriptionProvider;
  late final OfflineQueueProvider _offlineQueueProvider;
  late final MarketerApi _marketerApi;
  late final MarketerProvider _marketerProvider;

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
    _walletApi = WalletApi(_apiClient);
    _subscriptionApi = SubscriptionApi(_apiClient);
    _countriesApi = CountriesApi(_apiClient);
    _countriesProvider = CountriesProvider(countriesApi: _countriesApi);
    _marketerApi = MarketerApi(_apiClient);
    _marketerProvider = MarketerProvider(api: _marketerApi, walletApi: _walletApi);
    _wsService = WebSocketService();
    _locationService = LocationTrackingService(wsService: _wsService);
    _queueService = OfflineQueueService();

    _syncService = SyncService(
      queueService: _queueService,
      connectivityService: widget.connectivityService,
      jobApi: _jobApi,
    );

    _jobProvider = JobProvider(
      jobApi: _jobApi,
      syncService: _syncService,
      wsService: _wsService,
    );

    _collectorEarningsProvider = CollectorEarningsProvider(
      earningsApi: _earningsApi,
      walletApi: _walletApi,
    );

    _subscriptionProvider = SubscriptionProvider(
      subscriptionApi: _subscriptionApi,
      walletApi: _walletApi,
    );

    _authProvider = AuthProvider(
      authApi: _authApi,
      storage: _storage,
      wsService: _wsService,
      syncService: _syncService,
      onLogout: () {
        _jobProvider.reset();
        _collectorJobsProvider.reset();
        _subscriptionProvider.reset();
        _collectorEarningsProvider.reset();
      },
    );

    // Restore session immediately before UI builds
    _authProvider.tryRestoreSession();

    _collectorJobsProvider = CollectorJobsProvider(
      jobApi: _jobApi,
      filesApi: _filesApi,
      wsService: _wsService,
      locationService: _locationService,
    );

    _offlineQueueProvider = OfflineQueueProvider(
      queueService: _queueService,
      connectivityService: widget.connectivityService,
      syncService: _syncService,
    );

    _apiClient.onUnauthorized = () {
      _authProvider.setSessionExpired();
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
        ChangeNotifierProvider.value(value: _subscriptionProvider),
        ChangeNotifierProvider.value(value: _countriesProvider),
        ChangeNotifierProvider.value(value: _marketerProvider),
        Provider.value(value: widget.connectivityService),
        Provider.value(value: _locationService),
        Provider.value(value: _queueService),
        Provider.value(value: _syncService),
      ],
      child: MaterialApp(
        title: 'KmerTrash',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        routes: {
          '/login': (context) => const LoginScreen(),
          '/add-account': (context) => LoginScreen(
            addAccountMode: true,
            onSignUp: null,
          ),
          '/register': (context) => const RegisterScreen(),
          '/home': (context) => const HomeDashboardScreen(),
          '/bookings': (context) => const BookingsListScreen(),
          '/wallet': (context) => const WalletScreen(),
          '/profile': (context) => const ProfileScreen(),
          '/schedule-pickup': (context) => const SchedulePickupTypeScreen(),
          '/schedule-date-time': (context) => ScheduleDateTimeScreen(
            arguments: ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>? ?? {},
          ),
          '/schedule-location': (context) => ScheduleLocationScreen(
            arguments: ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>? ?? {},
          ),
          '/schedule-review': (context) => ScheduleReviewPaymentScreen(
            arguments: ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>? ?? {},
          ),
          '/subscription-plans': (context) => const SubscriptionPlansScreen(),
          '/manage-subscription': (context) => const ManageSubscriptionScreen(),
          '/booking-confirmed': (context) => BookingConfirmedScreen(
            arguments: ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>? ?? {},
          ),
          '/job-tracking': (context) => JobTrackingScreen(
            jobId: ModalRoute.of(context)?.settings.arguments as String? ?? '',
          ),
          '/booking-details': (context) => BookingDetailsScreen(
            jobId: ModalRoute.of(context)?.settings.arguments as String? ?? '',
          ),
          '/transactions': (context) => const TransactionHistoryScreen(),
          '/notifications': (context) => const NotificationsScreen(),
          '/support': (context) => const SupportScreen(),
          '/payment-methods': (context) => const PaymentMethodsScreen(),
          '/addresses': (context) => const AddressesScreen(),
          '/top-up': (context) => const TopUpWalletScreen(),
          // Collector routes
          '/collector-home': (context) => const CollectorShell(),
          '/collector-jobs': (context) => const CollectorShell(),
          '/collector-earnings': (context) => const CollectorShell(),
          '/collector-cashout': (context) => const CollectorCashoutScreen(),
          '/collector-cashout-success': (context) => const CollectorCashoutSuccessScreen(),
          '/collector-start-job': (context) => CollectorStartJobScreen(
            job: ModalRoute.of(context)?.settings.arguments as Job,
          ),
          '/collector-complete-job': (context) => CollectorCompleteJobScreen(
            job: ModalRoute.of(context)?.settings.arguments as Job,
          ),
          '/collector-job-completed': (context) => CollectorJobCompletedScreen(
            job: ModalRoute.of(context)?.settings.arguments as Job,
          ),
          '/collector-arrived': (context) => CollectorArrivedScreen(
            job: ModalRoute.of(context)?.settings.arguments as Job,
          ),
          '/collector-navigate': (context) => CollectorNavigateScreen(
            job: ModalRoute.of(context)?.settings.arguments as Job,
          ),
          '/collector-job-detail': (context) => const CollectorJobDetailScreen(),
        },
        home: _onboardingCompleted
            ? Consumer<AuthProvider>(
                builder: (context, auth, _) {
                  switch (auth.status) {
                    case AuthStatus.unknown:
                      return const _SplashScreen();
                    case AuthStatus.authenticated:
                      if (auth.user?.isCollector == true) {
                        return const CollectorShell();
                      }
                      if (auth.user?.isMarketer == true) {
                        return const MarketerShell();
                      }
                      return const HomeDashboardScreen();
                    case AuthStatus.unauthenticated:
                      return LoginScreen(
                        onSignUp: () {
                          setState(() => _onboardingCompleted = false);
                        },
                      );
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

class _SplashScreen extends StatefulWidget {
  const _SplashScreen();

  @override
  State<_SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<_SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _fadeAnim = CurvedAnimation(parent: _controller, curve: Curves.easeIn);
    _controller.forward();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AuthProvider>().tryRestoreSession();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: FadeTransition(
        opacity: _fadeAnim,
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Image.asset(
                'assets/images/logo-2.png',
                width: 240,
                fit: BoxFit.contain,
              ),
              const SizedBox(height: 48),
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF1B5E20)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
