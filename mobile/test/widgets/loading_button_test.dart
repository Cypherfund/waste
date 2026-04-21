import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wastewise/widgets/loading_button.dart';

void main() {
  group('LoadingButton', () {
    testWidgets('displays label when not loading', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: LoadingButton(label: 'Submit', onPressed: () {}),
        ),
      ));

      expect(find.text('Submit'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsNothing);
    });

    testWidgets('shows spinner when loading', (tester) async {
      await tester.pumpWidget(const MaterialApp(
        home: Scaffold(
          body: LoadingButton(label: 'Submit', isLoading: true),
        ),
      ));

      expect(find.text('Submit'), findsNothing);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('calls onPressed when tapped', (tester) async {
      var tapped = false;
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: LoadingButton(
            label: 'Tap Me',
            onPressed: () => tapped = true,
          ),
        ),
      ));

      await tester.tap(find.text('Tap Me'));
      expect(tapped, true);
    });

    testWidgets('does not call onPressed when loading', (tester) async {
      var tapped = false;
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: LoadingButton(
            label: 'Submit',
            isLoading: true,
            onPressed: () => tapped = true,
          ),
        ),
      ));

      await tester.tap(find.byType(ElevatedButton));
      expect(tapped, false);
    });
  });
}
