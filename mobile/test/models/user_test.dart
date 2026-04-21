import 'package:flutter_test/flutter_test.dart';
import 'package:wastewise/models/user.dart';

void main() {
  group('User model', () {
    final json = {
      'id': 'user-1',
      'name': 'John Doe',
      'phone': '+237670000001',
      'email': 'john@example.com',
      'role': 'HOUSEHOLD',
      'isActive': true,
      'createdAt': '2026-04-01T10:00:00.000Z',
    };

    test('fromJson creates User correctly', () {
      final user = User.fromJson(json);
      expect(user.id, 'user-1');
      expect(user.name, 'John Doe');
      expect(user.phone, '+237670000001');
      expect(user.email, 'john@example.com');
      expect(user.role, 'HOUSEHOLD');
      expect(user.isActive, true);
      expect(user.createdAt, DateTime.utc(2026, 4, 1, 10, 0, 0));
    });

    test('fromJson handles null email', () {
      final noEmail = {...json, 'email': null};
      final user = User.fromJson(noEmail);
      expect(user.email, isNull);
    });

    test('toJson produces correct map', () {
      final user = User.fromJson(json);
      final result = user.toJson();
      expect(result['id'], 'user-1');
      expect(result['name'], 'John Doe');
      expect(result['role'], 'HOUSEHOLD');
    });

    test('isHousehold returns true for HOUSEHOLD role', () {
      final user = User.fromJson(json);
      expect(user.isHousehold, true);
    });

    test('isHousehold returns false for COLLECTOR role', () {
      final collector = User.fromJson({...json, 'role': 'COLLECTOR'});
      expect(collector.isHousehold, false);
    });
  });
}
