import 'package:flutter_test/flutter_test.dart';
import 'package:wastewise/models/job.dart';
import 'package:wastewise/services/websocket/websocket_service.dart';

void main() {
  group('JobStatusUpdate', () {
    test('fromJson parses correctly', () {
      final json = {
        'jobId': 'job-1',
        'status': 'ASSIGNED',
        'collectorId': 'col-1',
        'updatedAt': '2026-04-20T12:00:00.000Z',
      };

      final update = JobStatusUpdate.fromJson(json);
      expect(update.jobId, 'job-1');
      expect(update.status, JobStatus.assigned);
      expect(update.collectorId, 'col-1');
      expect(update.updatedAt, isNotNull);
    });

    test('fromJson handles null collectorId', () {
      final json = {
        'jobId': 'job-1',
        'status': 'REQUESTED',
        'collectorId': null,
        'updatedAt': '2026-04-20T12:00:00.000Z',
      };

      final update = JobStatusUpdate.fromJson(json);
      expect(update.collectorId, isNull);
      expect(update.status, JobStatus.requested);
    });

    test('fromJson handles missing updatedAt', () {
      final json = {
        'jobId': 'job-1',
        'status': 'COMPLETED',
        'collectorId': 'col-1',
        'updatedAt': null,
      };

      final update = JobStatusUpdate.fromJson(json);
      expect(update.status, JobStatus.completed);
      expect(update.updatedAt, isNotNull); // defaults to DateTime.now()
    });
  });

  group('WebSocketService', () {
    test('isConnected returns false initially', () {
      final service = WebSocketService();
      expect(service.isConnected, false);
    });

    test('jobStatusStream is a broadcast stream', () {
      final service = WebSocketService();
      // Should be able to listen multiple times without error
      service.jobStatusStream.listen((_) {});
      service.jobStatusStream.listen((_) {});
      service.dispose();
    });
  });
}
