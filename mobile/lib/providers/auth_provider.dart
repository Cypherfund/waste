import 'package:flutter/foundation.dart';
import '../models/user.dart';
import '../models/auth_response.dart';
import '../services/api/api_client.dart';
import '../services/api/auth_api.dart';
import '../services/storage/secure_storage.dart';
import '../services/websocket/websocket_service.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthProvider extends ChangeNotifier {
  final AuthApi _authApi;
  final SecureStorageService _storage;
  final WebSocketService _wsService;

  AuthStatus _status = AuthStatus.unknown;
  User? _user;
  String? _error;
  bool _isLoading = false;

  AuthProvider({
    required AuthApi authApi,
    required SecureStorageService storage,
    required WebSocketService wsService,
  })  : _authApi = authApi,
        _storage = storage,
        _wsService = wsService;

  AuthStatus get status => _status;
  User? get user => _user;
  String? get error => _error;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _status == AuthStatus.authenticated;

  Future<void> tryRestoreSession() async {
    try {
      final user = await _storage.getUser();
      final token = await _storage.getAccessToken();

      if (user != null && token != null && (user.isHousehold || user.isCollector)) {
        _user = user;
        _status = AuthStatus.authenticated;
        _connectWebSocket(token);
      } else {
        await _storage.clearAll();
        _status = AuthStatus.unauthenticated;
      }
    } catch (_) {
      await _storage.clearAll();
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  Future<void> login({
    required String phone,
    required String password,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      debugPrint('AuthProvider: Starting login for phone: $phone');
      final response = await _authApi.login(phone: phone, password: password);
      debugPrint('AuthProvider: Login successful. User role: ${response.user.role}, isHousehold: ${response.user.isHousehold}, isCollector: ${response.user.isCollector}');

      if (!response.user.isHousehold && !response.user.isCollector) {
        throw Exception('This app is for household and collector users only. Your role: ${response.user.role}');
      }

      await _persistSession(response);
      _user = response.user;
      _status = AuthStatus.authenticated;
      debugPrint('AuthProvider: Status set to authenticated');
      _connectWebSocket(response.accessToken);
    } catch (e) {
      debugPrint('AuthProvider: Login failed with error: $e');
      _error = ApiClient.extractErrorMessage(e);
      _status = AuthStatus.unauthenticated;
      _user = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> register({
    required String name,
    required String phone,
    required String password,
    String? email,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      debugPrint('AuthProvider: Starting register for phone: $phone');
      final response = await _authApi.register(
        name: name,
        phone: phone,
        password: password,
        email: email,
      );
      debugPrint('AuthProvider: Register successful. User role: ${response.user.role}, isHousehold: ${response.user.isHousehold}, isCollector: ${response.user.isCollector}');

      if (!response.user.isHousehold && !response.user.isCollector) {
        throw Exception('This app is for household and collector users only. Your role: ${response.user.role}');
      }

      await _persistSession(response);
      _user = response.user;
      _status = AuthStatus.authenticated;
      debugPrint('AuthProvider: Status set to authenticated');
      _connectWebSocket(response.accessToken);
    } catch (e) {
      debugPrint('AuthProvider: Register failed with error: $e');
      _error = ApiClient.extractErrorMessage(e);
      _status = AuthStatus.unauthenticated;
      _user = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    try {
      await _authApi.logout();
    } catch (_) {
      // Ignore server errors on logout
    }
    _wsService.disconnect();
    await _storage.clearAll();
    _user = null;
    _status = AuthStatus.unauthenticated;
    _error = null;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  Future<void> _persistSession(AuthResponse response) async {
    await _storage.saveTokens(
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    );
    await _storage.saveUser(response.user);
  }

  void _connectWebSocket(String token) {
    if (_user != null) {
      _wsService.connect(
        accessToken: token,
        userId: _user!.id,
        role: _user!.role,
      );
    }
  }
}
