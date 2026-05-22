import '../../../services/api/api_client.dart';
import '../models/marketer_models.dart';

class MarketerApi {
  final ApiClient _client;

  MarketerApi(this._client);

  Future<MarketerDashboard> getDashboard() async {
    final res = await _client.dio.get('/marketer/dashboard');
    return MarketerDashboard.fromJson(res.data);
  }

  Future<MarketerProfile> getProfile() async {
    final res = await _client.dio.get('/marketer/profile');
    return MarketerProfile.fromJson(res.data);
  }

  Future<GrowthLead> createLead(CreateLeadRequest request) async {
    final res = await _client.dio.post('/marketer/leads', data: request.toJson());
    return GrowthLead.fromJson(res.data);
  }

  Future<List<GrowthLead>> getLeads({String? status}) async {
    final params = <String, String>{};
    if (status != null) params['status'] = status;
    final res = await _client.dio.get('/marketer/leads', queryParameters: params);
    return (res.data as List).map((e) => GrowthLead.fromJson(e)).toList();
  }

  Future<GrowthLead> getLeadById(String id) async {
    final res = await _client.dio.get('/marketer/leads/$id');
    return GrowthLead.fromJson(res.data);
  }

  Future<void> resendInvite(String leadId) async {
    await _client.dio.post('/marketer/leads/$leadId/resend');
  }

  Future<List<CommissionItem>> getCommissions() async {
    final res = await _client.dio.get('/marketer/commissions');
    final data = res.data as Map<String, dynamic>;
    final items = <CommissionItem>[];
    for (final entry in (data['pending'] as List)) {
      items.add(CommissionItem.fromJson(entry));
    }
    for (final entry in (data['approved'] as List)) {
      items.add(CommissionItem.fromJson(entry));
    }
    for (final entry in (data['paid'] as List)) {
      items.add(CommissionItem.fromJson(entry));
    }
    return items;
  }

  Future<void> requestPayout(CreatePayoutRequest request) async {
    await _client.dio.post('/marketer/payout-requests', data: request.toJson());
  }

  Future<List<PayoutItem>> getPayouts() async {
    final res = await _client.dio.get('/marketer/payout-requests');
    return (res.data as List).map((e) => PayoutItem.fromJson(e)).toList();
  }

  Future<List<NotificationItem>> getNotifications({bool? unreadOnly}) async {
    final params = <String, dynamic>{};
    if (unreadOnly == true) params['unreadOnly'] = true;
    final res = await _client.dio.get('/marketer/notifications', queryParameters: params);
    return (res.data as List).map((e) => NotificationItem.fromJson(e)).toList();
  }

  Future<void> markNotificationRead(String id) async {
    await _client.dio.patch('/marketer/notifications/$id/read');
  }

  Future<void> markAllNotificationsRead() async {
    await _client.dio.patch('/marketer/notifications/read-all');
  }

  Future<int> getUnreadCount() async {
    final res = await _client.dio.get('/marketer/notifications/unread-count');
    return (res.data['count'] as num).toInt();
  }

  Future<List<MarketingCampaign>> getActiveCampaigns() async {
    final res = await _client.dio.get('/marketer/campaigns/active');
    return (res.data as List).map((e) => MarketingCampaign.fromJson(e)).toList();
  }
}
