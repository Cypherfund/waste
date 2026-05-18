import 'package:flutter/foundation.dart';
import '../models/user.dart';
import '../models/auth_response.dart';
import '../models/saved_account.dart';
import '../services/api/api_client.dart';
import '../services/api/auth_api.dart';
import '../services/offline/sync_service.dart';
import '../services/storage/secure_storage.dart';
import '../services/websocket/websocket_service.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthProvider extends ChangeNotifier {
  final AuthApi _authApi;
  final SecureStorageService _storage;
  final WebSocketService _wsService;
  final SyncService _syncService;
  final VoidCallback? _onLogout;

  AuthStatus _status = AuthStatus.unknown;
  User? _user;
  String? _error;
  String? _sessionExpiredMessage;
  bool _isLoading = false;
  bool _isSwitching = false;
  List<SavedAccount> _savedAccounts = [];

  AuthProvider({
    required AuthApi authApi,
    required SecureStorageService storage,
    required WebSocketService wsService,
    required SyncService syncService,
    VoidCallback? onLogout,
  })  : _authApi = authApi,
        _storage = storage,
        _wsService = wsService,
        _syncService = syncService,
        _onLogout = onLogout {
    // WebSocket auth errors: only log, do not destroy the HTTP session.
    _wsService.onWsAuthError = () {
      debugPrint('[AuthProvider] WebSocket auth error - socket disconnected (session kept)');
    };
  }

  AuthStatus get status => _status;
  User? get user => _user;
  String? get error => _error;
  String? get sessionExpiredMessage => _sessionExpiredMessage;
  bool get isLoading => _isLoading;
  bool get isSwitching => _isSwitching;
  bool get isAuthenticated => _status == AuthStatus.authenticated;
  List<SavedAccount> get savedAccounts => List.unmodifiable(_savedAccounts);

  void clearSessionExpiredMessage() {
    _sessionExpiredMessage = null;
    notifyListeners();
  }

  Future<void> tryRestoreSession() async {
    try {
      final user = await _storage.getUser();
      final refreshToken = await _storage.getRefreshToken();

      if (user == null || refreshToken == null || (!user.isHousehold && !user.isCollector && !user.isMarketer)) {
        await _storage.clearAll();
        _status = AuthStatus.unauthenticated;
        notifyListeners();
        return;
      }

      // Proactively validate the session by attempting a token refresh.
      // This prevents the "flash home then kicked" UX when tokens are stale.
      final refreshed = await _tryRefreshTokens(refreshToken);

      if (!refreshed) {
        debugPrint('[AuthProvider] Stored session invalid — clearing and redirecting to login');
        await _storage.clearAll();
        _sessionExpiredMessage = 'Your session expired. Please log in again.';
        _status = AuthStatus.unauthenticated;
        notifyListeners();
        return;
      }

      final newToken = await _storage.getAccessToken();
      _user = user;
      _status = AuthStatus.authenticated;
      _syncService.setActiveUser(user.id);
      await _loadSavedAccounts();
      // Try to connect WebSocket but don't fail restoration if offline
      if (newToken != null) {
        try {
          _connectWebSocket(newToken);
        } catch (_) {
          debugPrint('[AuthProvider] WebSocket connection failed during restore - offline mode');
        }
      }
    } catch (e) {
      debugPrint('[AuthProvider] Session restore error: $e');
      await _storage.clearAll();
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  Future<bool> _tryRefreshTokens(String refreshToken) async {
    try {
      final response = await _authApi.refreshTokens(refreshToken);
      await _storage.saveTokens(
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      );
      return true;
    } catch (_) {
      return false;
    }
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

      if (!response.user.isHousehold && !response.user.isCollector && !response.user.isMarketer) {
        throw Exception('This app is for household, collector and marketer users only. Your role: ${response.user.role}');
      }

      await _persistSession(response);
      _user = response.user;
      _status = AuthStatus.authenticated;
      _syncService.setActiveUser(response.user.id);
      await _storage.setActiveAccountId(response.user.id);
      await _addCurrentAccountToSaved(response);
      await _loadSavedAccounts();
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
    required String role,
    String? email,
    String? countryCode,
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
        role: role,
        email: email,
        countryCode: countryCode,
      );
      debugPrint('AuthProvider: Register successful. User role: ${response.user.role}, isHousehold: ${response.user.isHousehold}, isCollector: ${response.user.isCollector}');

      if (!response.user.isHousehold && !response.user.isCollector && !response.user.isMarketer) {
        throw Exception('This app is for household, collector and marketer users only. Your role: ${response.user.role}');
      }

      await _persistSession(response);
      _user = response.user;
      _status = AuthStatus.authenticated;
      _syncService.setActiveUser(response.user.id);
      await _storage.setActiveAccountId(response.user.id);
      await _addCurrentAccountToSaved(response);
      await _loadSavedAccounts();
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

  Future<void> setSessionExpired() async {
    _sessionExpiredMessage = 'Your session expired. Please log in again.';
    await logout();
  }

  Future<void> logout() async {
    try {
      await _authApi.logout();
    } catch (_) {
      // Ignore server errors on logout
    }
    _wsService.disconnect();
    _syncService.setActiveUser(null);
    // Preserve saved_accounts and active_account_id — only clear session tokens
    final savedAccountsData = await _storage.getSavedAccounts();
    final activeId = await _storage.getActiveAccountId();
    await _storage.clearAll();
    // Restore multi-account data after clearAll
    for (final acc in savedAccountsData) {
      await _storage.saveAccount(acc);
    }
    if (activeId != null) await _storage.setActiveAccountId(activeId);
    _user = null;
    _status = AuthStatus.unauthenticated;
    _error = null;
    _onLogout?.call();
    notifyListeners();
  }

  // ─── Multi-account ─────────────────────────────────────────────

  Future<void> _loadSavedAccounts() async {
    _savedAccounts = await _storage.getSavedAccounts();
  }

  /// Called by the login screen to ensure saved accounts are visible after logout.
  Future<void> loadSavedAccountsIfNeeded() async {
    if (_savedAccounts.isEmpty) {
      await _loadSavedAccounts();
      notifyListeners();
    }
  }

  Future<void> _addCurrentAccountToSaved(AuthResponse response) async {
    final account = SavedAccount(
      id: response.user.id,
      name: response.user.name,
      phone: response.user.phone,
      role: response.user.role,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    );
    await _storage.saveAccount(account);
  }

  Future<void> switchAccount(SavedAccount account) async {
    if (_isSwitching || account.id == _user?.id) return;

    _isSwitching = true;
    notifyListeners();

    try {
      // Refresh the target account's token
      final refreshed = await _tryRefreshTokensForAccount(account);

      if (!refreshed) {
        // Token is invalid — remove from saved list
        await _storage.removeAccount(account.id);
        await _syncService.clearJobsForUser(account.id);
        await _loadSavedAccounts();
        _isSwitching = false;
        notifyListeners();
        return;
      }

      // Get the fresh tokens that were saved
      final accounts = await _storage.getSavedAccounts();
      final updated = accounts.firstWhere((a) => a.id == account.id,
          orElse: () => account);

      // Reset all provider state
      _onLogout?.call();
      _wsService.disconnect();

      // Switch active session
      await _storage.saveTokens(
        accessToken: updated.accessToken,
        refreshToken: updated.refreshToken,
      );
      // Build a minimal User from the SavedAccount
      final userJson = {
        'id': updated.id,
        'name': updated.name,
        'phone': updated.phone,
        'email': null,
        'role': updated.role,
        'isActive': true,
        'createdAt': DateTime.now().toIso8601String(),
      };
      final newUser = User.fromJson(userJson);
      await _storage.saveUser(newUser);
      await _storage.setActiveAccountId(updated.id);

      _syncService.setActiveUser(updated.id);
      _user = newUser;
      _status = AuthStatus.authenticated;
      await _loadSavedAccounts();
      _connectWebSocket(updated.accessToken);
    } catch (e) {
      debugPrint('[AuthProvider] switchAccount error: $e');
    } finally {
      _isSwitching = false;
      notifyListeners();
    }
  }

  Future<bool> _tryRefreshTokensForAccount(SavedAccount account) async {
    try {
      final response = await _authApi.refreshTokens(account.refreshToken);
      // Update stored tokens for this account
      final updated = account.copyWith(
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      );
      await _storage.saveAccount(updated);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> removeAccount(String userId) async {
    if (userId == _user?.id) {
      // Logging out current account
      await logout();
      return;
    }
    await _storage.removeAccount(userId);
    await _syncService.clearJobsForUser(userId);
    await _loadSavedAccounts();
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
