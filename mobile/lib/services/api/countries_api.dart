import 'api_client.dart';

class SupportedCountry {
  final String countryCode;
  final String countryName;
  final String phonePrefix;
  final String? flagEmoji;
  final String currency;
  final bool isActive;

  const SupportedCountry({
    required this.countryCode,
    required this.countryName,
    required this.phonePrefix,
    this.flagEmoji,
    required this.currency,
    required this.isActive,
  });

  factory SupportedCountry.fromJson(Map<String, dynamic> json) {
    return SupportedCountry(
      countryCode: json['countryCode'] as String,
      countryName: json['countryName'] as String,
      phonePrefix: json['phonePrefix'] as String,
      flagEmoji: json['flagEmoji'] as String?,
      currency: json['currency'] as String,
      isActive: json['isActive'] as bool? ?? true,
    );
  }
}

class CountriesApi {
  final ApiClient _client;

  CountriesApi(this._client);

  Future<List<SupportedCountry>> getActiveCountries() async {
    final response = await _client.dio.get('/countries');
    final list = response.data as List<dynamic>;
    return list
        .map((e) => SupportedCountry.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
