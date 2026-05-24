import 'package:flutter/foundation.dart';
import '../models/subscription.dart';
import '../services/api/api_client.dart';
import '../services/api/subscription_api.dart';
import '../services/api/wallet_api.dart';

class SubscriptionProvider extends ChangeNotifier {
  final SubscriptionApi _api;
  final WalletApi _walletApi;

  List<SubscriptionPlan> _plans = [];
  UserSubscription? _subscription;
  PricingQuote? _pricingQuote;
  AppConfig? _appConfig;
  double? _walletBalance;
  bool _isLoading = false;
  bool _isPricingLoading = false;
  bool _isActing = false;
  String? _error;

  SubscriptionProvider({
    required SubscriptionApi subscriptionApi,
    required WalletApi walletApi,
  })  : _api = subscriptionApi,
        _walletApi = walletApi;

  List<SubscriptionPlan> get plans => _plans;
  UserSubscription? get subscription => _subscription;
  PricingQuote? get pricingQuote => _pricingQuote;
  AppConfig? get appConfig => _appConfig;
  double? get walletBalance => _walletBalance;
  bool get isLoading => _isLoading;
  bool get isPricingLoading => _isPricingLoading;
  bool get isActing => _isActing;
  String? get error => _error;

  bool get hasActiveSubscription =>
      _subscription != null && _subscription!.isActive;

  Future<void> loadPlans() async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      _plans = await _api.getPlans();
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadMySubscription() async {
    try {
      _subscription = await _api.getMySubscription();
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
    } finally {
      notifyListeners();
    }
  }

  Future<void> loadPricingQuote() async {
    _isPricingLoading = true;
    notifyListeners();
    try {
      _appConfig = await _walletApi.getAppConfig();
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
    }
    try {
      _pricingQuote = await _api.getPricingQuote();
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
    }
    _isPricingLoading = false;
    notifyListeners();
  }

  Future<void> loadWalletBalance() async {
    try {
      _walletBalance = await _walletApi.getBalance();
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
    } finally {
      notifyListeners();
    }
  }

  Future<bool> subscribe(String planId) async {
    _isActing = true;
    _error = null;
    notifyListeners();
    try {
      _subscription = await _api.subscribe(planId);
      await loadPricingQuote();
      return true;
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
      return false;
    } finally {
      _isActing = false;
      notifyListeners();
    }
  }

  Future<bool> cancel() async {
    _isActing = true;
    _error = null;
    notifyListeners();
    try {
      _subscription = await _api.cancel();
      _pricingQuote = null;
      await loadPricingQuote();
      return true;
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
      return false;
    } finally {
      _isActing = false;
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  // Clear user-specific data on logout — plans are kept since they are not user-specific
  void reset() {
    _subscription = null;
    _pricingQuote = null;
    _appConfig = null;
    _walletBalance = null;
    _isLoading = false;
    _isActing = false;
    _error = null;
    notifyListeners();
  }
}
