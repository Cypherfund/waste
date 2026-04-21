import '../../models/earning.dart';
import 'api_client.dart';

class EarningsApi {
  final ApiClient _client;

  EarningsApi(this._client);

  Future<EarningsSummary> getEarnings({String? from, String? to}) async {
    final params = <String, dynamic>{};
    if (from != null) params['from'] = from;
    if (to != null) params['to'] = to;
    final response =
        await _client.dio.get('/jobs/earnings', queryParameters: params);
    return EarningsSummary.fromJson(response.data as Map<String, dynamic>);
  }

  Future<EarningsQuickSummary> getEarningsSummary() async {
    final response = await _client.dio.get('/jobs/earnings/summary');
    return EarningsQuickSummary.fromJson(
        response.data as Map<String, dynamic>);
  }
}
