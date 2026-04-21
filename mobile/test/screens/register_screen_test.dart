import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:mocktail/mocktail.dart';
import 'package:wastewise/providers/auth_provider.dart';
import 'package:wastewise/screens/auth/register_screen.dart';
import 'package:wastewise/services/api/auth_api.dart';
import 'package:wastewise/services/storage/secure_storage.dart';
import 'package:wastewise/services/websocket/websocket_service.dart';

class MockAuthApi extends Mock implements AuthApi {}

class MockSecureStorage extends Mock implements SecureStorageService {}

class MockWebSocketService extends Mock implements WebSocketService {}

Widget buildTestWidget(AuthProvider provider) {
  return MaterialApp(
    home: ChangeNotifierProvider.value(
      value: provider,
      child: const RegisterScreen(),
    ),
    routes: {
      '/login': (_) => const Scaffold(body: Text('Login Page')),
    },
  );
}

void main() {
  late MockAuthApi mockAuthApi;
  late MockSecureStorage mockStorage;
  late MockWebSocketService mockWsService;
  late AuthProvider provider;

  setUp(() {
    mockAuthApi = MockAuthApi();
    mockStorage = MockSecureStorage();
    mockWsService = MockWebSocketService();
    when(() => mockWsService.connect(
          accessToken: any(named: 'accessToken'),
          userId: any(named: 'userId'),
        )).thenReturn(null);
    when(() => mockWsService.disconnect()).thenReturn(null);

    provider = AuthProvider(
      authApi: mockAuthApi,
      storage: mockStorage,
      wsService: mockWsService,
    );
  });

  group('RegisterScreen', () {
    testWidgets('renders registration form', (tester) async {
      await tester.pumpWidget(buildTestWidget(provider));
      await tester.pumpAndSettle();

      expect(find.text('Create Account'), findsWidgets);
      expect(find.text('Full Name'), findsOneWidget);
      expect(find.text('Phone Number'), findsOneWidget);
      expect(find.text('Email (optional)'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('Confirm Password'), findsOneWidget);
      expect(find.text('Sign In'), findsOneWidget);
    });

    testWidgets('shows validation errors on empty submit', (tester) async {
      await tester.pumpWidget(buildTestWidget(provider));
      await tester.pumpAndSettle();

      // Scroll to make button visible and tap
      await tester.dragUntilVisible(
        find.byType(ElevatedButton),
        find.byType(SingleChildScrollView),
        const Offset(0, -200),
      );
      await tester.tap(find.byType(ElevatedButton));
      await tester.pumpAndSettle();

      expect(find.text('Name is required'), findsOneWidget);
      expect(find.text('Phone number is required'), findsOneWidget);
      expect(find.text('Password is required'), findsOneWidget);
    });

    testWidgets('validates password minimum length', (tester) async {
      await tester.pumpWidget(buildTestWidget(provider));
      await tester.pumpAndSettle();

      await tester.enterText(
        find.widgetWithText(TextFormField, 'Full Name'),
        'John',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Phone Number'),
        '+237670000001',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'short',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Confirm Password'),
        'short',
      );

      await tester.dragUntilVisible(
        find.byType(ElevatedButton),
        find.byType(SingleChildScrollView),
        const Offset(0, -200),
      );
      await tester.tap(find.byType(ElevatedButton));
      await tester.pumpAndSettle();

      expect(find.text('Password must be at least 8 characters'), findsOneWidget);
    });

    testWidgets('validates password confirmation match', (tester) async {
      await tester.pumpWidget(buildTestWidget(provider));
      await tester.pumpAndSettle();

      await tester.enterText(
        find.widgetWithText(TextFormField, 'Full Name'),
        'John Doe',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Phone Number'),
        '+237670000001',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'password123',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Confirm Password'),
        'differentpass',
      );

      await tester.dragUntilVisible(
        find.byType(ElevatedButton),
        find.byType(SingleChildScrollView),
        const Offset(0, -200),
      );
      await tester.tap(find.byType(ElevatedButton));
      await tester.pumpAndSettle();

      expect(find.text('Passwords do not match'), findsOneWidget);
    });

    testWidgets('has Sign In link visible', (tester) async {
      await tester.pumpWidget(buildTestWidget(provider));
      await tester.pumpAndSettle();

      // Scroll to bottom to see the link
      await tester.dragUntilVisible(
        find.text('Sign In'),
        find.byType(SingleChildScrollView),
        const Offset(0, -200),
      );
      expect(find.text('Sign In'), findsOneWidget);
      expect(find.text('Already have an account? '), findsOneWidget);
    });
  });
}
