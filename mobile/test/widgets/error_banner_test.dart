import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wastewise/widgets/error_banner.dart';

void main() {
  group('ErrorBanner', () {
    testWidgets('displays error message', (tester) async {
      await tester.pumpWidget(const MaterialApp(
        home: Scaffold(
          body: ErrorBanner(message: 'Something went wrong'),
        ),
      ));

      expect(find.text('Something went wrong'), findsOneWidget);
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
    });

    testWidgets('shows close icon when onDismiss provided', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: ErrorBanner(message: 'Error', onDismiss: () {}),
        ),
      ));

      expect(find.byIcon(Icons.close), findsOneWidget);
    });

    testWidgets('hides close icon when onDismiss is null', (tester) async {
      await tester.pumpWidget(const MaterialApp(
        home: Scaffold(
          body: ErrorBanner(message: 'Error'),
        ),
      ));

      expect(find.byIcon(Icons.close), findsNothing);
    });

    testWidgets('calls onDismiss when close tapped', (tester) async {
      var dismissed = false;
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: ErrorBanner(
            message: 'Error',
            onDismiss: () => dismissed = true,
          ),
        ),
      ));

      await tester.tap(find.byIcon(Icons.close));
      expect(dismissed, true);
    });
  });
}
