import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:wastewise/models/earning.dart';
import 'package:wastewise/providers/collector_earnings_provider.dart';
import 'package:wastewise/services/api/earnings_api.dart';

class MockEarningsApi extends Mock implements EarningsApi {}

void main() {
  late MockEarningsApi mockEarningsApi;
  late CollectorEarningsProvider provider;

  final testQuickSummary = EarningsQuickSummary(
    today: 500,
    thisWeek: 2500,
    thisMonth: 10000,
    allTime: 50000,
  );

  final testDetailedSummary = EarningsSummary(
    totalEarnings: 5000,
    pendingEarnings: 1000,
    confirmedEarnings: 4000,
    jobCount: 8,
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
    ],
  );

  setUp(() {
    mockEarningsApi = MockEarningsApi();
    provider = CollectorEarningsProvider(earningsApi: mockEarningsApi);
  });

  group('loadQuickSummary', () {
    test('loads quick summary successfully', () async {
      when(() => mockEarningsApi.getEarningsSummary())
          .thenAnswer((_) async => testQuickSummary);

      await provider.loadQuickSummary();

      expect(provider.quickSummary, isNotNull);
      expect(provider.quickSummary!.today, 500);
      expect(provider.quickSummary!.thisWeek, 2500);
      expect(provider.quickSummary!.allTime, 50000);
      expect(provider.isLoading, false);
      expect(provider.error, isNull);
    });

    test('sets error on failure', () async {
      when(() => mockEarningsApi.getEarningsSummary())
          .thenThrow(Exception('Network error'));

      await provider.loadQuickSummary();

      expect(provider.quickSummary, isNull);
      expect(provider.error, isNotNull);
    });
  });

  group('loadDetailedEarnings', () {
    test('loads detailed earnings successfully', () async {
      when(() => mockEarningsApi.getEarnings(
            from: any(named: 'from'),
            to: any(named: 'to'),
          )).thenAnswer((_) async => testDetailedSummary);

      await provider.loadDetailedEarnings();

      expect(provider.detailedSummary, isNotNull);
      expect(provider.detailedSummary!.totalEarnings, 5000);
      expect(provider.detailedSummary!.jobCount, 8);
      expect(provider.detailedSummary!.earnings.length, 1);
      expect(provider.isLoading, false);
    });

    test('sets error on failure', () async {
      when(() => mockEarningsApi.getEarnings(
            from: any(named: 'from'),
            to: any(named: 'to'),
          )).thenThrow(Exception('Server error'));

      await provider.loadDetailedEarnings();

      expect(provider.detailedSummary, isNull);
      expect(provider.error, isNotNull);
    });

    test('passes date filters', () async {
      when(() => mockEarningsApi.getEarnings(
            from: '2026-04-01',
            to: '2026-04-30',
          )).thenAnswer((_) async => testDetailedSummary);

      await provider.loadDetailedEarnings(
          from: '2026-04-01', to: '2026-04-30');

      verify(() => mockEarningsApi.getEarnings(
            from: '2026-04-01',
            to: '2026-04-30',
          )).called(1);
    });
  });

  group('clearError', () {
    test('clears error', () async {
      when(() => mockEarningsApi.getEarningsSummary())
          .thenThrow(Exception('Error'));

      await provider.loadQuickSummary();
      expect(provider.error, isNotNull);

      provider.clearError();
      expect(provider.error, isNull);
    });
  });
}
