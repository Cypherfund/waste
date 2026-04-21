import 'package:flutter/foundation.dart';
import '../models/earning.dart';
import '../services/api/api_client.dart';
import '../services/api/earnings_api.dart';

class CollectorEarningsProvider extends ChangeNotifier {
  final EarningsApi _earningsApi;

  EarningsQuickSummary? _quickSummary;
  EarningsSummary? _detailedSummary;
  bool _isLoading = false;
  String? _error;

  CollectorEarningsProvider({required EarningsApi earningsApi})
      : _earningsApi = earningsApi;

  EarningsQuickSummary? get quickSummary => _quickSummary;
  EarningsSummary? get detailedSummary => _detailedSummary;
  bool get isLoading => _isLoading;
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

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
