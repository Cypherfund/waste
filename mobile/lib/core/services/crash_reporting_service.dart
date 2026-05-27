import 'package:firebase_crashlytics/firebase_crashlytics.dart';

class CrashReportingService {
  static final CrashReportingService _instance = CrashReportingService._internal();
  factory CrashReportingService() => _instance;
  CrashReportingService._internal();

  final FirebaseCrashlytics _crashlytics = FirebaseCrashlytics.instance;

  /// Set user context after login
  Future<void> setUser({
    required String userId,
    required String role,
  }) async {
    await _crashlytics.setUserIdentifier(userId);
    await _crashlytics.setCustomKey('userId', userId);
    await _crashlytics.setCustomKey('role', role);
  }

  /// Clear user context on logout
  Future<void> clearUser() async {
    await _crashlytics.setUserIdentifier('');
    await _crashlytics.setCustomKey('role', '');
    await _crashlytics.setCustomKey('userId', '');
  }

  /// Set app context on startup
  Future<void> setAppContext({
    required String appVersion,
    required String buildNumber,
  }) async {
    await _crashlytics.setCustomKey('appVersion', appVersion);
    await _crashlytics.setCustomKey('buildNumber', buildNumber);
  }

  /// Set current screen context
  Future<void> setCurrentScreen(String screenName) async {
    await _crashlytics.setCustomKey('currentScreen', screenName);
  }

  /// Set last action context
  Future<void> setLastAction(String action) async {
    await _crashlytics.setCustomKey('lastAction', action);
  }

  /// Set last notification type context
  Future<void> setLastNotificationType(String notificationType) async {
    await _crashlytics.setCustomKey('lastNotificationType', notificationType);
  }

  /// Set last payment mode context
  Future<void> setLastPaymentMode(String paymentMode) async {
    await _crashlytics.setCustomKey('lastPaymentMode', paymentMode);
  }

  /// Log non-fatal error
  Future<void> recordError(
    dynamic exception,
    StackTrace? stack, {
    bool fatal = false,
    Map<String, dynamic>? context,
  }) async {
    await _crashlytics.recordError(
      exception,
      stack,
      fatal: fatal,
      information: context?.entries.map((e) => '${e.key}: ${e.value}') ?? [],
    );
  }

  /// Add breadcrumb
  Future<void> addBreadcrumb(String message) async {
    await _crashlytics.log(message);
  }
}
