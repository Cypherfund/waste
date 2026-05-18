import 'package:flutter/foundation.dart';
import '../data/marketer_api.dart';
import '../models/marketer_models.dart';
import '../../../services/api/wallet_api.dart';

class MarketerProvider extends ChangeNotifier {
  final MarketerApi _api;
  final WalletApi _walletApi;

  MarketerProvider({required MarketerApi api, required WalletApi walletApi})
      : _api = api,
        _walletApi = walletApi;

  MarketerDashboard? _dashboard;
  MarketerDashboard? get dashboard => _dashboard;

  List<GrowthLead> _leads = [];
  List<GrowthLead> get leads => _leads;

  List<CommissionItem> _commissions = [];
  List<CommissionItem> get commissions => _commissions;

  List<PayoutItem> _payouts = [];
  List<PayoutItem> get payouts => _payouts;

  List<NotificationItem> _notifications = [];
  List<NotificationItem> get notifications => _notifications;

  int _unreadCount = 0;
  int get unreadCount => _unreadCount;

  PayoutConfig? _payoutConfig;
  PayoutConfig? get payoutConfig => _payoutConfig;

  bool _loading = false;
  bool get loading => _loading;

  String? _error;
  String? get error => _error;

  Future<void> loadDashboard() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _dashboard = await _api.getDashboard();
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> loadLeads({String? status}) async {
    _loading = true;
    notifyListeners();
    try {
      _leads = await _api.getLeads(status: status);
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<GrowthLead> createLead(CreateLeadRequest request) async {
    final lead = await _api.createLead(request);
    _leads.insert(0, lead);
    notifyListeners();
    return lead;
  }

  Future<void> resendInvite(String leadId) async {
    await _api.resendInvite(leadId);
  }

  Future<void> loadCommissions() async {
    _loading = true;
    notifyListeners();
    try {
      _commissions = await _api.getCommissions();
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> requestPayout(CreatePayoutRequest request) async {
    await _api.requestPayout(request);
    await loadPayouts();
    await loadDashboard();
  }

  Future<void> loadPayouts() async {
    _loading = true;
    notifyListeners();
    try {
      _payouts = await _api.getPayouts();
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> loadNotifications({bool? unreadOnly}) async {
    try {
      _notifications = await _api.getNotifications(unreadOnly: unreadOnly);
      _unreadCount = _notifications.where((n) => !n.isRead).length;
      notifyListeners();
    } catch (e) {
      debugPrint('Error loading notifications: $e');
    }
  }

  Future<void> markNotificationRead(String id) async {
    await _api.markNotificationRead(id);
    final idx = _notifications.indexWhere((n) => n.id == id);
    if (idx >= 0 && !_notifications[idx].isRead) {
      _notifications[idx] = NotificationItem(
        id: _notifications[idx].id,
        type: _notifications[idx].type,
        title: _notifications[idx].title,
        message: _notifications[idx].message,
        isRead: true,
        createdAt: _notifications[idx].createdAt,
      );
      _unreadCount = (_unreadCount - 1).clamp(0, 999);
      notifyListeners();
    }
  }

  Future<void> loadPayoutConfig() async {
    try {
      _payoutConfig = await _walletApi.getPayoutConfig();
      notifyListeners();
    } catch (e) {
      debugPrint('Error loading payout config: $e');
    }
  }

  Future<void> refreshUnreadCount() async {
    try {
      _unreadCount = await _api.getUnreadCount();
      notifyListeners();
    } catch (_) {}
  }
}
