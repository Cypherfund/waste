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
  }) async {
    final response = await _client.dio.post('/auth/register', data: {
      'name': name,
      'phone': phone,
      'password': password,
      'role': role,
      if (email != null && email.isNotEmpty) 'email': email,
    });
    return AuthResponse.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> logout() async {
    await _client.dio.post('/auth/logout');
  }
}
