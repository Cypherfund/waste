import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
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

  /// Send OTP to phone number
  Future<OtpResponse> sendOtp({
    required String phone,
  }) async {
    final response = await _client.dio.post('/auth/otp/send', data: {
      'phone': phone,
    });
    return OtpResponse.fromJson(response.data as Map<String, dynamic>);
  }

  /// Verify OTP code
  Future<OtpResponse> verifyOtp({
    required String phone,
    required String code,
  }) async {
    final response = await _client.dio.post('/auth/otp/verify', data: {
      'phone': phone,
      'code': code,
    });
    return OtpResponse.fromJson(response.data as Map<String, dynamic>);
  }
}

class OtpResponse {
  final bool success;
  final String? message;
  final String? error;
  final String? otp; // Only returned in dev mode
  final bool devMode;

  OtpResponse({
    required this.success,
    this.message,
    this.error,
    this.otp,
    this.devMode = false,
  });

  factory OtpResponse.fromJson(Map<String, dynamic> json) {
    return OtpResponse(
      success: json['success'] as bool,
      message: json['message'] as String?,
      error: json['error'] as String?,
      otp: json['otp'] as String?,
      devMode: json['devMode'] as bool? ?? false,
    );
  }
}
