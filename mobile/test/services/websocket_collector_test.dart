import 'package:flutter_test/flutter_test.dart';
import 'package:wastewise/models/job.dart';
import 'package:wastewise/services/websocket/websocket_service.dart';

void main() {
  group('CollectorAssignedEvent', () {
    test('fromJson parses correctly', () {
      final json = {
        'jobId': 'job-1',
        'status': 'ASSIGNED',
        'householdId': 'hh-1',
        'updatedAt': '2026-04-20T08:00:00.000Z',
      };

      final event = CollectorAssignedEvent.fromJson(json);
      expect(event.jobId, 'job-1');
      expect(event.status, JobStatus.assigned);
      expect(event.householdId, 'hh-1');
      expect(event.updatedAt, isNotNull);
    });

    test('fromJson handles null householdId', () {
      final json = {
        'jobId': 'job-2',
        'status': 'ASSIGNED',
        'householdId': null,
        'updatedAt': null,
      };

      final event = CollectorAssignedEvent.fromJson(json);
      expect(event.householdId, isNull);
      expect(event.updatedAt, isNotNull); // defaults to DateTime.now()
    });
  });

  group('JobLocationUpdate', () {
    test('fromJson parses correctly', () {
      final json = {
        'jobId': 'job-1',
        'collectorLat': 4.0435,
        'collectorLng': 9.6966,
        'accuracy': 10.5,
        'updatedAt': '2026-04-20T08:30:00.000Z',
      };

      final update = JobLocationUpdate.fromJson(json);
      expect(update.jobId, 'job-1');
      expect(update.collectorLat, 4.0435);
      expect(update.collectorLng, 9.6966);
      expect(update.accuracy, 10.5);
      expect(update.updatedAt, isNotNull);
    });

    test('fromJson handles integer values', () {
      final json = {
        'jobId': 'job-2',
        'collectorLat': 4,
        'collectorLng': 9,
        'accuracy': 15,
        'updatedAt': null,
      };

      final update = JobLocationUpdate.fromJson(json);
      expect(update.collectorLat, 4.0);
      expect(update.collectorLng, 9.0);
      expect(update.accuracy, 15.0);
    });
  });
}
