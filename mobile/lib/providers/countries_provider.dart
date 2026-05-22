import 'package:flutter/foundation.dart';
import '../services/api/countries_api.dart';
import '../services/api/api_client.dart';

class CountriesProvider extends ChangeNotifier {
  final CountriesApi _countriesApi;

  List<SupportedCountry> _countries = [];
  bool _isLoading = false;
  String? _error;

  CountriesProvider({required CountriesApi countriesApi})
      : _countriesApi = countriesApi;

  List<SupportedCountry> get countries => _countries;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadCountries() async {
    if (_countries.isNotEmpty) return; // already loaded
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _countries = await _countriesApi.getActiveCountries();
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
      // Fallback to Cameroon so onboarding never breaks
      _countries = [
        const SupportedCountry(
          countryCode: 'cmr',
          countryName: 'Cameroon',
          phonePrefix: '+237',
          flagEmoji: '🇨🇲',
          currency: 'XAF',
          isActive: true,
        ),
      ];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
