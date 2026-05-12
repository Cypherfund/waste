import 'package:flutter/foundation.dart';
import '../models/earning.dart';
import '../services/api/api_client.dart';
import '../services/api/earnings_api.dart';
import '../services/api/wallet_api.dart';

class CollectorEarningsProvider extends ChangeNotifier {
  final EarningsApi _earningsApi;
  final WalletApi _walletApi;

  EarningsQuickSummary? _quickSummary;
  EarningsSummary? _detailedSummary;
  double? _walletBalance;
  PayoutConfig? _payoutConfig;
  List<PayoutRequest> _payoutHistory = [];
  bool _isLoading = false;
  bool _isWithdrawing = false;
  String? _error;

  CollectorEarningsProvider({
    required EarningsApi earningsApi,
    required WalletApi walletApi,
  })  : _earningsApi = earningsApi,
        _walletApi = walletApi;

  EarningsQuickSummary? get quickSummary => _quickSummary;
  EarningsSummary? get detailedSummary => _detailedSummary;
  double get walletBalance => _walletBalance ?? 0;
  PayoutConfig? get payoutConfig => _payoutConfig;
  List<PayoutRequest> get payoutHistory => _payoutHistory;
  bool get isLoading => _isLoading;
  bool get isWithdrawing => _isWithdrawing;
  String? get error => _error;

  Future<void> loadQuickSummary() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _quickSummary = await _earningsApi.getEarningsSummary();
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadDetailedEarnings({String? from, String? to}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _detailedSummary = await _earningsApi.getEarnings(from: from, to: to);
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadWallet() async {
    try {
      final results = await Future.wait([
        _walletApi.getBalance(),
        _walletApi.getPayoutConfig(),
        _walletApi.getMyPayouts(),
      ]);
      _walletBalance = results[0] as double;
      _payoutConfig = results[1] as PayoutConfig;
      _payoutHistory = results[2] as List<PayoutRequest>;
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
    }
    notifyListeners();
  }

  Future<bool> requestWithdrawal({
    required double amount,
    required String method,
    String? accountNumber,
    String? accountName,
  }) async {
    _isWithdrawing = true;
    _error = null;
    notifyListeners();
    try {
      await _walletApi.requestWithdrawal(
        amount: amount,
        method: method,
        accountNumber: accountNumber,
        accountName: accountName,
      );
      await loadWallet();
      return true;
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
      notifyListeners();
      return false;
    } finally {
      _isWithdrawing = false;
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  // Clear all data - called on logout
  void reset() {
    _quickSummary = null;
    _detailedSummary = null;
    _walletBalance = null;
    _payoutConfig = null;
    _payoutHistory = [];
    _isLoading = false;
    _isWithdrawing = false;
    _error = null;
    notifyListeners();
  }
}
