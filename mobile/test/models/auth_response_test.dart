import 'package:flutter_test/flutter_test.dart';
import 'package:wastewise/models/auth_response.dart';

void main() {
  group('AuthResponse', () {
    test('fromJson parses full response', () {
      final json = {
        'user': {
          'id': 'user-1',
          'name': 'John Doe',
          'phone': '+237670000001',
          'email': null,
          'role': 'HOUSEHOLD',
          'isActive': true,
          'createdAt': '2026-04-01T10:00:00.000Z',
        },
        'accessToken': 'access-token-123',
        'refreshToken': 'refresh-token-456',
      };

      final response = AuthResponse.fromJson(json);
      expect(response.user.id, 'user-1');
      expect(response.user.name, 'John Doe');
      expect(response.accessToken, 'access-token-123');
      expect(response.refreshToken, 'refresh-token-456');
    });
  });

  group('TokenResponse', () {
    test('fromJson parses tokens', () {
      final json = {
        'accessToken': 'new-access',
        'refreshToken': 'new-refresh',
      };

      final response = TokenResponse.fromJson(json);
      expect(response.accessToken, 'new-access');
      expect(response.refreshToken, 'new-refresh');
    });
  });
}
