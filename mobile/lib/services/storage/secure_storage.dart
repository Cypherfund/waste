import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../models/user.dart';
import '../../models/saved_account.dart';

class SecureStorageService {
  final FlutterSecureStorage _storage;

  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const _keyAccessToken = 'access_token';
  static const _keyRefreshToken = 'refresh_token';
  static const _keyUser = 'user';
  static const _keySavedAccounts = 'saved_accounts';
  static const _keyActiveAccountId = 'active_account_id';

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: _keyAccessToken, value: accessToken);
    await _storage.write(key: _keyRefreshToken, value: refreshToken);
  }

  Future<void> saveUser(User user) async {
    await _storage.write(key: _keyUser, value: jsonEncode(user.toJson()));
  }

  Future<String?> getAccessToken() async {
    return _storage.read(key: _keyAccessToken);
  }

  Future<String?> getRefreshToken() async {
    return _storage.read(key: _keyRefreshToken);
  }

  Future<User?> getUser() async {
    final data = await _storage.read(key: _keyUser);
    if (data == null) return null;
    try {
      return User.fromJson(jsonDecode(data) as Map<String, dynamic>);
    } catch (_) {
      await clearAll();
      return null;
    }
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }

  // ─── Multi-account storage ────────────────────────────────────

  Future<List<SavedAccount>> getSavedAccounts() async {
    final data = await _storage.read(key: _keySavedAccounts);
    if (data == null || data.isEmpty) return [];
    try {
      return SavedAccount.listFromJson(data);
    } catch (_) {
      return [];
    }
  }

  Future<void> saveAccount(SavedAccount account) async {
    final accounts = await getSavedAccounts();
    final index = accounts.indexWhere((a) => a.id == account.id);
    if (index != -1) {
      accounts[index] = account;
    } else {
      accounts.add(account);
    }
    await _storage.write(
      key: _keySavedAccounts,
      value: SavedAccount.listToJson(accounts),
    );
  }

  Future<void> removeAccount(String userId) async {
    final accounts = await getSavedAccounts();
    accounts.removeWhere((a) => a.id == userId);
    await _storage.write(
      key: _keySavedAccounts,
      value: SavedAccount.listToJson(accounts),
    );
  }

  Future<String?> getActiveAccountId() async {
    return _storage.read(key: _keyActiveAccountId);
  }

  Future<void> setActiveAccountId(String userId) async {
    await _storage.write(key: _keyActiveAccountId, value: userId);
  }
}
