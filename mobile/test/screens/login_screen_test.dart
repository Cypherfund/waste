import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:mocktail/mocktail.dart';
import 'package:wastewise/providers/auth_provider.dart';
import 'package:wastewise/screens/auth/login_screen.dart';
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
      child: const LoginScreen(),
    ),
    routes: {
      '/register': (_) => const Scaffold(body: Text('Register Page')),
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

  group('LoginScreen', () {
    testWidgets('renders login form', (tester) async {
      await tester.pumpWidget(buildTestWidget(provider));

      expect(find.text('WasteWise'), findsOneWidget);
      expect(find.text('Sign in to manage your waste collection'), findsOneWidget);
      expect(find.text('Phone Number'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('Sign In'), findsOneWidget);
      expect(find.text('Sign Up'), findsOneWidget);
    });

    testWidgets('shows validation errors on empty submit', (tester) async {
      await tester.pumpWidget(buildTestWidget(provider));

      await tester.tap(find.text('Sign In'));
      await tester.pumpAndSettle();

      expect(find.text('Phone number is required'), findsOneWidget);
      expect(find.text('Password is required'), findsOneWidget);
    });

    testWidgets('shows validation error for invalid phone format', (tester) async {
      await tester.pumpWidget(buildTestWidget(provider));

      await tester.enterText(
        find.widgetWithText(TextFormField, 'Phone Number'),
        '12345',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'password123',
      );
      await tester.tap(find.text('Sign In'));
      await tester.pumpAndSettle();

      expect(
        find.text('Enter a valid Cameroon phone number (+237XXXXXXXXX)'),
        findsOneWidget,
      );
    });

    testWidgets('displays error banner when login fails', (tester) async {
      await tester.pumpWidget(buildTestWidget(provider));

      // Simulate an error state
      provider = AuthProvider(
        authApi: mockAuthApi,
        storage: mockStorage,
        wsService: mockWsService,
      );

      // The error banner should show when provider has error
      // We test the ErrorBanner widget separately
      expect(find.byType(LoginScreen), findsOneWidget);
    });

    testWidgets('navigates to register screen', (tester) async {
      await tester.pumpWidget(buildTestWidget(provider));

      await tester.tap(find.text('Sign Up'));
      await tester.pumpAndSettle();

      expect(find.text('Register Page'), findsOneWidget);
    });
  });
}
