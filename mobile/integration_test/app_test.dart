import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wastewise/main.dart' as app;
import 'package:provider/provider.dart';
import 'package:wastewise/providers/auth_provider.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('App Integration Tests', () {
    testWidgets('app launches and shows splash screen', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Verify splash screen is displayed
      expect(find.byIcon(Icons.eco), findsOneWidget);
      expect(find.text('WasteWise'), findsOneWidget);
    });

    testWidgets('unauthenticated user sees login screen', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Should show login screen after splash
      expect(find.text('Login'), findsOneWidget);
      expect(find.byType(ElevatedButton), findsWidgets);
    });

    testWidgets('can navigate to register screen', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Find and tap register link
      final registerButton = find.text('Register');
      expect(registerButton, findsOneWidget);
      await tester.tap(registerButton);
      await tester.pumpAndSettle();

      // Should show register screen
      expect(find.text('Register'), findsOneWidget);
    });
  });

  group('Job Creation Integration Tests', () => {
    testWidgets('household can navigate to create job screen', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      // This would require authentication first
      // For integration tests, we'd typically use mock credentials
      // or a test environment with pre-configured users
    }, skip: true) // Skip for now as it requires backend
  });

  group('Offline Sync Integration Tests', () => {
    testWidgets('offline queue screen is accessible', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Would need to navigate to sync queue screen
      // This requires authentication
    }, skip: true) // Skip for now as it requires authentication
  });
}
