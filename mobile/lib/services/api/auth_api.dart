import 'package:dio/dio.dart';
import '../../config/app_config.dart';
import '../../models/auth_response.dart';
import 'api_client.dart';

class AuthApi {
  final ApiClient _client;

  AuthApi(this._client);

  Future<AuthResponse> login({
    required String phone,
    required String password,
  }) async {
    final response = await _client.dio.post('/auth/login', data: {
      'phone': phone,
      'password': password,
    });
    return AuthResponse.fromJson(response.data as Map<String, dynamic>);
  }

  Future<AuthResponse> register({
    required String name,
    required String phone,
    required String password,
    required String role,
    String? email,
    String? countryCode,
    String? referralToken,
  }) async {
    final requestData = {
      'name': name,
      'phone': phone,
      'password': password,
      'role': role,
      if (email != null && email.isNotEmpty) 'email': email,
      if (countryCode != null && countryCode.isNotEmpty) 'countryCode': countryCode,
      if (referralToken != null && referralToken.isNotEmpty) 'referralToken': referralToken,
    };
    debugPrint('[AuthApi] Register request data: $requestData');
    debugPrint('[AuthApi] ReferralToken in request: $referralToken');
    final response = await _client.dio.post('/auth/register', data: requestData);
    return AuthResponse.fromJson(response.data as Map<String, dynamic>);
  }

  Future<TokenResponse> refreshTokens(String refreshToken) async {
    // Use a separate Dio instance to bypass the auth interceptor (avoid loops).
    final response = await Dio(BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      headers: {'Content-Type': 'application/json'},
    )).post('/auth/refresh', data: {'refreshToken': refreshToken});
    return TokenResponse.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> logout() async {
    await _client.dio.post('/auth/logout');
  }
}
