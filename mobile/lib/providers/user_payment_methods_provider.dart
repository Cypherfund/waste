import 'package:flutter/foundation.dart';
import '../services/api/wallet_api.dart';

class UserPaymentMethodsProvider extends ChangeNotifier {
  final WalletApi _walletApi;

  List<UserPaymentMethod> _methods = [];
  bool _loading = false;
  String? _error;
  String? _lastUsage; // Track the last usage type loaded

  UserPaymentMethodsProvider({required WalletApi walletApi}) : _walletApi = walletApi;

  List<UserPaymentMethod> get methods => _methods;
  bool get loading => _loading;
  String? get error => _error;

  // Getters for filtered methods
  List<UserPaymentMethod> get cashinMethods =>
      _methods.where((m) => m.supportsCashin).toList();

  List<UserPaymentMethod> get cashoutMethods =>
      _methods.where((m) => m.supportsCashout).toList();

  UserPaymentMethod? get defaultCashinMethod =>
      cashinMethods.firstWhere((m) => m.isDefault, orElse: () => cashinMethods.first);

  UserPaymentMethod? get defaultCashoutMethod =>
      cashoutMethods.firstWhere((m) => m.isDefault, orElse: () => cashoutMethods.first);

  Future<void> loadMethods({String? usage, bool forceRefresh = false}) async {
    // Return early if already loaded for the same usage and not forcing refresh
    if (!forceRefresh && _lastUsage == usage && _methods.isNotEmpty) {
      return;
    }

    _loading = true;
    _error = null;
    notifyListeners();

    try {
      _methods = await _walletApi.getMyPaymentMethods(usage: usage);
      _lastUsage = usage;
    } catch (e) {
      _error = 'Unable to load payment methods. Please try again.';
      debugPrint('Error loading payment methods: $e');
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> addMethod({
    required String paymentCode,
    required String accountNumber,
    String? accountName,
    String? usageType,
    bool? isDefault,
  }) async {
    try {
      final newMethod = await _walletApi.addPaymentMethod(
        paymentCode: paymentCode,
        accountNumber: accountNumber,
        accountName: accountName,
        usageType: usageType,
        isDefault: isDefault,
      );
      _methods.add(newMethod);
      notifyListeners();
    } catch (e) {
      _error = 'Unable to add payment method. Please try again.';
      debugPrint('Error adding payment method: $e');
      rethrow;
    }
  }

  Future<void> updateMethod(
    String id, {
    String? accountNumber,
    String? accountName,
  }) async {
    try {
      final updated = await _walletApi.updatePaymentMethod(
        id,
        accountNumber: accountNumber,
        accountName: accountName,
      );
      final index = _methods.indexWhere((m) => m.id == id);
      if (index != -1) {
        _methods[index] = updated;
      }
      notifyListeners();
    } catch (e) {
      _error = 'Unable to update payment method. Please try again.';
      debugPrint('Error updating payment method: $e');
      rethrow;
    }
  }

  Future<void> deleteMethod(String id) async {
    try {
      await _walletApi.deletePaymentMethod(id);
      _methods.removeWhere((m) => m.id == id);
      notifyListeners();
    } catch (e) {
      _error = 'Unable to delete payment method. Please try again.';
      debugPrint('Error deleting payment method: $e');
      rethrow;
    }
  }

  Future<void> setDefault(String id, String usage) async {
    try {
      await _walletApi.setDefaultPaymentMethod(id, usage);
      await loadMethods(); // Reload to get updated default state
    } catch (e) {
      _error = 'Unable to update default payment method. Please try again.';
      debugPrint('Error setting default payment method: $e');
      rethrow;
    }
  }

  void reset() {
    _methods = [];
    _loading = false;
    _error = null;
    notifyListeners();
  }
}
