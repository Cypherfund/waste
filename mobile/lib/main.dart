import 'dart:ui';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb, kDebugMode, defaultTargetPlatform, TargetPlatform;
import 'package:package_info_plus/package_info_plus.dart';
import 'firebase_options.dart';
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
import 'services/api/notifications_api.dart';
import 'providers/notifications_provider.dart';
import 'providers/user_payment_methods_provider.dart';
import 'services/api/countries_api.dart';
import 'providers/subscription_provider.dart';
import 'providers/countries_provider.dart';
import 'services/storage/secure_storage.dart';
import 'services/websocket/websocket_service.dart';
import 'services/location/location_tracking_service.dart';
import 'services/offline/offline_queue_service.dart';
import 'services/offline/sync_service.dart';
import 'services/offline/connectivity_service.dart';
import 'services/deep_link/deep_link_service.dart';
import 'screens/collector/collector_shell.dart';
import 'screens/collector/collector_cashout_screen.dart';
import 'features/shared/payment_methods_setup_screen.dart';
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
import 'features/household/providers/payment_flow_provider.dart';
import 'features/household/presentation/screens/review_pickup_screen.dart';
import 'features/household/presentation/screens/choose_payment_method_screen.dart';
import 'features/household/presentation/screens/manual_payment_screen.dart';
import 'features/household/presentation/screens/cash_confirmation_screen.dart';
import 'features/household/presentation/screens/integrated_payment_screen.dart';
import 'features/household/presentation/screens/payment_processing_screen.dart';
import 'features/household/presentation/screens/payment_result_screen.dart';
import 'services/api/app_update_api.dart';
import 'providers/app_update_provider.dart';
import 'screens/update/force_update_screen.dart';
import 'widgets/optional_update_dialog.dart';
import 'services/fcm_service.dart';
import 'core/services/notification_navigation_service.dart';
import 'core/services/crash_reporting_service.dart';

final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

  // Initialize Crashlytics
  const enableCrashlyticsInDebug = bool.fromEnvironment(
    'ENABLE_CRASHLYTICS_DEBUG',
    defaultValue: false,
  );
  await FirebaseCrashlytics.instance.setCrashlyticsCollectionEnabled(
    !kDebugMode || enableCrashlyticsInDebug,
  );

  // Catch Flutter framework errors
  FlutterError.onError = (errorDetails) {
    FirebaseCrashlytics.instance.recordFlutterFatalError(errorDetails);
    // Ensure errors are visible in debug mode when Crashlytics is disabled
    FlutterError.presentError(errorDetails);
  };

  // Catch platform errors (async errors not caught by FlutterError.onError)
  PlatformDispatcher.instance.onError = (error, stack) {
    FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
    return true;
  };

  // Set app context in Crashlytics
  final packageInfo = await PackageInfo.fromPlatform();
  await CrashReportingService().setAppContext(
    appVersion: packageInfo.version,
    buildNumber: packageInfo.buildNumber,
  );

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
  late final NotificationsApi _notificationsApi;
  late final NotificationsProvider _notificationsProvider;
  late final UserPaymentMethodsProvider _userPaymentMethodsProvider;
  late final DeepLinkService _deepLinkService;
  late final AppUpdateApi _appUpdateApi;
  late final AppUpdateProvider _appUpdateProvider;
  late final FcmService _fcmService;
  late final NotificationNavigationService _notificationNavigationService;

  @override
  void initState() {
    super.initState();
    _onboardingCompleted = widget.onboardingCompleted;
    _storage = SecureStorageService();
    _deepLinkService = DeepLinkService();
    _deepLinkService.onReferralLinkReceived = _handleReferralLink;
    _deepLinkService.init();

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
    _notificationsApi = NotificationsApi(_apiClient);
    _notificationsProvider = NotificationsProvider(api: _notificationsApi);
    _userPaymentMethodsProvider = UserPaymentMethodsProvider(walletApi: _walletApi);
    _appUpdateApi = AppUpdateApi(_apiClient);
    _appUpdateProvider = AppUpdateProvider(
      api: _appUpdateApi,
      platform: kIsWeb ? 'ALL' : _detectPlatform(),
      appType: 'ALL',
    );
    _fcmService = FcmService(apiClient: _apiClient);
    _wsService = WebSocketService();
    _locationService = LocationTrackingService(wsService: _wsService);
    _queueService = OfflineQueueService();

    _notificationNavigationService = NotificationNavigationService(
      navigatorKey: appNavigatorKey,
      isAuthenticated: () => _authProvider.user != null,
      appUpdateCallback: (data) => _appUpdateProvider.handlePushData(data),
    );

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
        _notificationsProvider.reset();
        _userPaymentMethodsProvider.reset();
        _marketerProvider.reset();
      },
    );

    // Wire WebSocket stream so app:update events trigger re-checks in real time
    _appUpdateProvider.listenToWebSocket(_wsService.appUpdateStream);

    // Update appType whenever the authenticated user's role is known
    _authProvider.addListener(_onAuthChanged);
    _authProvider.addListener(_onAuthChangedFcm);

    // Restore session immediately before UI builds
    _authProvider.tryRestoreSession();

    // Handle notification taps when app was killed
    _checkInitialMessage();

    // Check if there's a pending referral token from a deep link
    // If so, logout and show onboarding
    if (_deepLinkService.pendingReferralToken != null) {
      _handleReferralLink();
    }

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

  void _onAuthChanged() {
    final user = _authProvider.user;
    if (user == null) return;
    final appType = user.isCollector
        ? 'COLLECTOR'
        : user.isMarketer
            ? 'MARKETER'
            : 'HOUSEHOLD';
    _appUpdateProvider.updateAppType(appType);

    // Process pending notification navigation after confirmed login
    // Only run when auth status is authenticated, not on every auth change
    if (_authProvider.status == AuthStatus.authenticated) {
      _notificationNavigationService.processPendingAfterLogin();
    }
  }

  void _onAuthChangedFcm() {
    if (_authProvider.user == null) return;
    _fcmService.init(
      onForegroundMessage: (message) {
        final type = message.data['type'];
        if (type == 'APP_UPDATE_AVAILABLE') {
          _appUpdateProvider.handlePushData(message.data);
          return;
        }

        // Show in-app banner for other notification types
        _showNotificationBanner(message);
      },
    );

    // Handle notification taps when app is in background
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      _notificationNavigationService.handleNotificationTap(message.data);
    });
  }

  void _showNotificationBanner(RemoteMessage message) {
    final title = message.notification?.title ?? message.data['title'] ?? 'Notification';
    final body = message.notification?.body ?? message.data['body'] ?? '';

    final snackBar = SnackBar(
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(body),
        ],
      ),
      action: SnackBarAction(
        label: 'View',
        onPressed: () {
          _notificationNavigationService.handleNotificationTap(message.data);
        },
      ),
      duration: const Duration(seconds: 5),
    );

    ScaffoldMessenger.of(context).showSnackBar(snackBar);
  }

  Future<void> _checkInitialMessage() async {
    final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
    if (initialMessage != null) {
      // Delay slightly to allow auth state to settle
      Future.delayed(const Duration(milliseconds: 500), () {
        _notificationNavigationService.handleNotificationTap(initialMessage.data);
      });
    }
  }

  @override
  void dispose() {
    _authProvider.removeListener(_onAuthChanged);
    _authProvider.removeListener(_onAuthChangedFcm);
    super.dispose();
  }

  String _detectPlatform() {
    if (defaultTargetPlatform == TargetPlatform.android) return 'ANDROID';
    if (defaultTargetPlatform == TargetPlatform.iOS) return 'IOS';
    return 'ALL';
  }

  void _handleReferralLink() {
    // If user is logged in, logout them and show onboarding with referral token
    if (_authProvider.status == AuthStatus.authenticated) {
      _authProvider.logout();
    }
    // Navigate to onboarding/register screen
    setState(() => _onboardingCompleted = false);
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
        ChangeNotifierProvider.value(value: _notificationsProvider),
        ChangeNotifierProvider.value(value: _userPaymentMethodsProvider),
        ChangeNotifierProvider.value(value: _appUpdateProvider),
        ChangeNotifierProvider(create: (_) => PaymentFlowProvider()),
        Provider.value(value: _walletApi),
        Provider.value(value: _filesApi),
        Provider.value(value: widget.connectivityService),
        Provider.value(value: _locationService),
        Provider.value(value: _queueService),
        Provider.value(value: _syncService),
        Provider.value(value: _deepLinkService),
      ],
      child: MaterialApp(
        title: 'KmerTrash',
        navigatorKey: appNavigatorKey,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        onGenerateRoute: (settings) {
          // Handle query parameters for register route on web
          if (kIsWeb) {
            final uri = Uri.base;
            final token = uri.queryParameters['token'];
            if (token != null && token.isNotEmpty) {
              debugPrint('[Main] Found token in URL: $token, route: ${settings.name}');
              // If on root path with token, navigate to register screen
              if (settings.name == '/' || settings.name == null) {
                return MaterialPageRoute(
                  builder: (context) => RegisterScreen(initialReferralToken: token),
                );
              }
              // If explicitly navigating to register with token
              if (settings.name == '/register') {
                return MaterialPageRoute(
                  builder: (context) => RegisterScreen(initialReferralToken: token),
                );
              }
            }
          }
          // Default route handling for other routes
          return null;
        },
        routes: {
          '/login': (context) => const LoginScreen(),
          '/add-account': (context) => LoginScreen(
            addAccountMode: true,
            onSignUp: null,
          ),
          // '/register' is handled by onGenerateRoute to support query parameters
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
          // New payment flow screens
          '/review-pickup': (context) => ReviewPickupScreen(
            arguments: ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>? ?? {},
          ),
          '/choose-payment-method': (context) => const ChoosePaymentMethodScreen(),
          '/manual-payment': (context) => const ManualPaymentScreen(),
          '/integrated-payment': (context) => const IntegratedPaymentScreen(),
          '/payment-processing': (context) => const PaymentProcessingScreen(),
          '/cash-confirmation': (context) => const CashConfirmationScreen(),
          '/payment-result': (context) => PaymentResultScreen(
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
          '/payment-methods-setup': (context) => const PaymentMethodsSetupScreen(),
          '/addresses': (context) => const AddressesScreen(),
          '/top-up': (context) => const TopUpWalletScreen(),
          // Marketer routes
          '/marketer-home': (context) => const MarketerShell(),
          '/earnings': (context) {
            final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>? ?? {};
            final initialTab = args['tab'] as String?;
            return MarketerShell(initialTab: initialTab);
          },
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
        home: _AppUpdateGate(
          updateProvider: _appUpdateProvider,
          child: _onboardingCompleted
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
      ),
    );
  }
}

// ─── App Update Gate ──────────────────────────────────────────────────────────
// Wraps the entire app home. Shows ForceUpdateScreen when required.
// Shows OptionalUpdateDialog once per 24h.
class _AppUpdateGate extends StatefulWidget {
  final AppUpdateProvider updateProvider;
  final Widget child;

  const _AppUpdateGate({required this.updateProvider, required this.child});

  @override
  State<_AppUpdateGate> createState() => _AppUpdateGateState();
}

class _AppUpdateGateState extends State<_AppUpdateGate>
    with WidgetsBindingObserver {
  bool _optionalShown = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    widget.updateProvider.addListener(_onUpdateChanged);
    // Fire the initial check non-blocking after the first frame so the gate
    // listener is already attached when the result arrives.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      widget.updateProvider.checkForUpdate();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    widget.updateProvider.removeListener(_onUpdateChanged);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      widget.updateProvider.checkForUpdate(force: true);
    }
  }

  Future<void> _onUpdateChanged() async {
    if (!mounted) return;
    final provider = widget.updateProvider;
    if (provider.hasForceUpdate) return; // handled by build
    if (provider.hasOptionalUpdate && !_optionalShown) {
      final should = await provider.shouldShowOptionalDialog();
      if (should && mounted) {
        _optionalShown = true;
        await OptionalUpdateDialog.show(
          context,
          provider.updateInfo!,
          () async {
            await provider.dismissOptionalUpdate();
            if (mounted) Navigator.of(context, rootNavigator: true).pop();
          },
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.updateProvider,
      builder: (context, _) {
        if (widget.updateProvider.hasForceUpdate) {
          return ForceUpdateScreen(info: widget.updateProvider.updateInfo!);
        }
        return widget.child;
      },
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
