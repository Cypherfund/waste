import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api/app_update_api.dart';

class AppUpdateProvider extends ChangeNotifier {
  final AppUpdateApi _api;
  final String _platform;
  String _appType;

  AppUpdateInfo? _updateInfo;
  bool _checked = false;
  StreamSubscription<Map<String, dynamic>>? _wsSubscription;

  AppUpdateInfo? get updateInfo => _updateInfo;
  bool get hasForceUpdate => _updateInfo?.forceUpdate == true;
  bool get hasOptionalUpdate =>
      (_updateInfo?.updateAvailable == true) && (_updateInfo?.forceUpdate == false);

  static const _optionalDismissedKey = 'app_update_optional_dismissed_at';
  static const _dismissCooldownHours = 24;

  AppUpdateProvider({
    required AppUpdateApi api,
    required String platform,
    required String appType,
  })  : _api = api,
        _platform = platform,
        _appType = appType;

  // Updates the app type and re-checks with the correct type.
  // Call this after the user's role is known (session restore / login).
  void updateAppType(String appType) {
    if (_appType == appType) return;
    _appType = appType;
    _checked = false;
    checkForUpdate();
  }

  Future<void> checkForUpdate({bool force = false}) async {
    if (_checked && !force) return;
    _checked = true;

    final info = await _api.checkUpdate(platform: _platform, appType: _appType);
    _updateInfo = info;
    notifyListeners();
  }

  Future<bool> shouldShowOptionalDialog() async {
    if (!hasOptionalUpdate) return false;
    final prefs = await SharedPreferences.getInstance();
    final lastDismissed = prefs.getInt(_optionalDismissedKey);
    if (lastDismissed == null) return true;
    final elapsed = DateTime.now().millisecondsSinceEpoch - lastDismissed;
    return elapsed > const Duration(hours: _dismissCooldownHours).inMilliseconds;
  }

  Future<void> dismissOptionalUpdate() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(
      _optionalDismissedKey,
      DateTime.now().millisecondsSinceEpoch,
    );
  }

  // Call this from your FCM foreground message handler when a push arrives.
  // Example (firebase_messaging):
  //   FirebaseMessaging.onMessage.listen((msg) {
  //     if (msg.data['type'] == 'APP_UPDATE_AVAILABLE') {
  //       appUpdateProvider.handlePushData(msg.data);
  //     }
  //   });
  Future<void> handlePushData(Map<String, dynamic> data) async {
    if (data['type'] != 'APP_UPDATE_AVAILABLE') return;
    await checkForUpdate(force: true);
  }

  // Call after WebSocket connects to receive real-time app:update events.
  void listenToWebSocket(Stream<Map<String, dynamic>> stream) {
    _wsSubscription?.cancel();
    _wsSubscription = stream.listen((_) {
      checkForUpdate(force: true);
    });
  }

  void reset() {
    _updateInfo = null;
    _checked = false;
    notifyListeners();
  }

  @override
  void dispose() {
    _wsSubscription?.cancel();
    super.dispose();
  }
}
