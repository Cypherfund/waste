import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:mocktail/mocktail.dart';
import 'package:wastewise/models/earning.dart';
import 'package:wastewise/providers/collector_earnings_provider.dart';
import 'package:wastewise/services/api/earnings_api.dart';
import 'package:wastewise/screens/collector/collector_earnings_screen.dart';

class MockEarningsApi extends Mock implements EarningsApi {}

void main() {
  late MockEarningsApi mockEarningsApi;
  late CollectorEarningsProvider provider;

  setUp(() {
    mockEarningsApi = MockEarningsApi();

    when(() => mockEarningsApi.getEarningsSummary())
        .thenAnswer((_) async => EarningsQuickSummary(
              today: 1000,
              thisWeek: 5000,
              thisMonth: 20000,
              allTime: 100000,
            ));

    when(() => mockEarningsApi.getEarnings(
          from: any(named: 'from'),
          to: any(named: 'to'),
        )).thenAnswer((_) async => EarningsSummary(
          totalEarnings: 5000,
          pendingEarnings: 1000,
          confirmedEarnings: 4000,
          jobCount: 3,
          earnings: [
            Earning(
              id: 'earn-1',
              jobId: 'job-1',
              collectorId: 'col-1',
              baseAmount: 500,
              distanceAmount: 100,
              surgeMultiplier: 1.0,
              totalAmount: 600,
              status: EarningStatus.CONFIRMED,
              confirmedAt: DateTime(2026, 4, 15),
              createdAt: DateTime(2026, 4, 15),
            ),
            Earning(
              id: 'earn-2',
              jobId: 'job-2',
              collectorId: 'col-1',
              baseAmount: 500,
              distanceAmount: 200,
              surgeMultiplier: 1.2,
              totalAmount: 840,
              status: EarningStatus.PENDING,
              createdAt: DateTime(2026, 4, 16),
            ),
          ],
        ));

    provider = CollectorEarningsProvider(earningsApi: mockEarningsApi);
  });

  Widget buildTestWidget() {
    return ChangeNotifierProvider.value(
      value: provider,
      child: const MaterialApp(home: CollectorEarningsScreen()),
    );
  }

  group('CollectorEarningsScreen', () {
    testWidgets('renders earnings screen with title', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Earnings'), findsWidgets);
    });

    testWidgets('displays quick summary card', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Earnings Overview'), findsOneWidget);
      expect(find.text('100000 XAF'), findsOneWidget);
      expect(find.text('All Time'), findsOneWidget);
      expect(find.text('Today'), findsOneWidget);
      expect(find.text('This Week'), findsOneWidget);
      expect(find.text('This Month'), findsOneWidget);
    });

    testWidgets('displays earning cards', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('600 XAF'), findsOneWidget);
      expect(find.text('840 XAF'), findsOneWidget);
      expect(find.text('CONFIRMED'), findsOneWidget);
      expect(find.text('PENDING'), findsOneWidget);
    });

    testWidgets('displays job count chip', (tester) async {
      await tester.pumpWidget(buildTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('3 jobs'), findsOneWidget);
    });

    testWidgets('shows error when API fails', (tester) async {
      when(() => mockEarningsApi.getEarningsSummary())
          .thenThrow(Exception('Network error'));
      when(() => mockEarningsApi.getEarnings(
            from: any(named: 'from'),
            to: any(named: 'to'),
          )).thenThrow(Exception('Network error'));

      final errorProvider =
          CollectorEarningsProvider(earningsApi: mockEarningsApi);

      await tester.pumpWidget(
        ChangeNotifierProvider.value(
          value: errorProvider,
          child: const MaterialApp(home: CollectorEarningsScreen()),
        ),
      );
      await tester.pumpAndSettle();

      // Should show loading or error state
      expect(errorProvider.error, isNotNull);
    });
  });
}
