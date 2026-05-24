import 'package:flutter/foundation.dart';
import '../../models/subscription.dart';
import 'api_client.dart';

class SubscriptionApi {
  final ApiClient _client;

  SubscriptionApi(this._client);

  Future<List<SubscriptionPlan>> getPlans() async {
    final response = await _client.dio.get('/subscriptions/plans');
    debugPrint('[SubscriptionApi] Response: ${response.data}');
    final list = response.data as List<dynamic>;
    debugPrint('[SubscriptionApi] List length: ${list.length}');
    return list
        .map((e) => SubscriptionPlan.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<UserSubscription> subscribe(String planId) async {
    final response = await _client.dio.post(
      '/subscriptions/subscribe',
      data: {'planId': planId},
    );
    return UserSubscription.fromJson(response.data as Map<String, dynamic>);
  }

  Future<UserSubscription?> getMySubscription() async {
    final response = await _client.dio.get('/subscriptions/my');
    if (response.data == null) return null;
    return UserSubscription.fromJson(response.data as Map<String, dynamic>);
  }

  Future<UserSubscription> cancel() async {
    final response = await _client.dio.post('/subscriptions/cancel');
    return UserSubscription.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PricingQuote> getPricingQuote() async {
    final response = await _client.dio.get('/subscriptions/pricing-quote');
    return PricingQuote.fromJson(response.data as Map<String, dynamic>);
  }
}
