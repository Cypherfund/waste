import 'package:flutter_test/flutter_test.dart';
import 'package:wastewise/models/earning.dart';

void main() {
  group('EarningStatus', () {
    test('fromString parses valid statuses', () {
      expect(EarningStatus.fromString('PENDING'), EarningStatus.PENDING);
      expect(EarningStatus.fromString('CONFIRMED'), EarningStatus.CONFIRMED);
      expect(EarningStatus.fromString('PAID'), EarningStatus.PAID);
    });

    test('fromString defaults to PENDING for unknown', () {
      expect(EarningStatus.fromString('UNKNOWN'), EarningStatus.PENDING);
    });
  });

  group('Earning', () {
    test('fromJson parses correctly', () {
      final json = {
        'id': 'earn-1',
        'jobId': 'job-1',
        'collectorId': 'col-1',
        'baseAmount': 500,
        'distanceAmount': 150.5,
        'surgeMultiplier': 1.2,
        'totalAmount': 780.6,
        'status': 'CONFIRMED',
        'confirmedAt': '2026-04-15T10:00:00.000Z',
        'createdAt': '2026-04-15T09:00:00.000Z',
      };

      final earning = Earning.fromJson(json);
      expect(earning.id, 'earn-1');
      expect(earning.jobId, 'job-1');
      expect(earning.collectorId, 'col-1');
      expect(earning.baseAmount, 500.0);
      expect(earning.distanceAmount, 150.5);
      expect(earning.surgeMultiplier, 1.2);
      expect(earning.totalAmount, 780.6);
      expect(earning.status, EarningStatus.CONFIRMED);
      expect(earning.confirmedAt, isNotNull);
      expect(earning.createdAt, isNotNull);
    });

    test('fromJson handles null confirmedAt', () {
      final json = {
        'id': 'earn-2',
        'jobId': 'job-2',
        'collectorId': 'col-1',
        'baseAmount': 500,
        'distanceAmount': 0,
        'surgeMultiplier': 1.0,
        'totalAmount': 500,
        'status': 'PENDING',
        'confirmedAt': null,
        'createdAt': '2026-04-15T09:00:00.000Z',
      };

      final earning = Earning.fromJson(json);
      expect(earning.status, EarningStatus.PENDING);
      expect(earning.confirmedAt, isNull);
    });
  });

  group('EarningsSummary', () {
    test('fromJson parses correctly', () {
      final json = {
        'totalEarnings': 5000.0,
        'pendingEarnings': 1000.0,
        'confirmedEarnings': 4000.0,
        'jobCount': 10,
        'earnings': [
          {
            'id': 'earn-1',
            'jobId': 'job-1',
            'collectorId': 'col-1',
            'baseAmount': 500,
            'distanceAmount': 0,
            'surgeMultiplier': 1.0,
            'totalAmount': 500,
            'status': 'CONFIRMED',
            'confirmedAt': '2026-04-15T10:00:00.000Z',
            'createdAt': '2026-04-15T09:00:00.000Z',
          },
        ],
      };

      final summary = EarningsSummary.fromJson(json);
      expect(summary.totalEarnings, 5000.0);
      expect(summary.pendingEarnings, 1000.0);
      expect(summary.confirmedEarnings, 4000.0);
      expect(summary.jobCount, 10);
      expect(summary.earnings.length, 1);
    });
  });

  group('EarningsQuickSummary', () {
    test('fromJson parses correctly', () {
      final json = {
        'today': 500.0,
        'thisWeek': 2500.0,
        'thisMonth': 10000.0,
        'allTime': 50000.0,
      };

      final summary = EarningsQuickSummary.fromJson(json);
      expect(summary.today, 500.0);
      expect(summary.thisWeek, 2500.0);
      expect(summary.thisMonth, 10000.0);
      expect(summary.allTime, 50000.0);
    });
  });
}
