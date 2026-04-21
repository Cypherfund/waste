import 'package:flutter_test/flutter_test.dart';
import 'package:wastewise/services/offline/offline_queue_service.dart';

void main() {
  group('QueuedItem', () {
    test('fromMap parses correctly', () {
      final map = {
        'id': 'q-1',
        'action': 'CREATE_JOB',
        'job_id': null,
        'data': '{"scheduledDate":"2026-04-20","scheduledTime":"08:00-10:00","locationAddress":"123 Test St"}',
        'status': 'PENDING',
        'retry_count': 0,
        'error_message': null,
        'created_at': '2026-04-20T08:00:00.000',
        'updated_at': '2026-04-20T08:00:00.000',
      };

      final item = QueuedItem.fromMap(map);

      expect(item.id, 'q-1');
      expect(item.action, QueueAction.CREATE_JOB);
      expect(item.jobId, isNull);
      expect(item.data['scheduledDate'], '2026-04-20');
      expect(item.data['locationAddress'], '123 Test St');
      expect(item.status, QueueStatus.PENDING);
      expect(item.retryCount, 0);
      expect(item.errorMessage, isNull);
    });

    test('fromMap handles COMPLETE_JOB with jobId', () {
      final map = {
        'id': 'q-2',
        'action': 'COMPLETE_JOB',
        'job_id': 'job-123',
        'data': '{"proofImageUrl":"https://cdn.example.com/proof.jpg"}',
        'status': 'SYNCED',
        'retry_count': 0,
        'error_message': null,
        'created_at': '2026-04-20T10:00:00.000',
        'updated_at': '2026-04-20T10:05:00.000',
      };

      final item = QueuedItem.fromMap(map);

      expect(item.action, QueueAction.COMPLETE_JOB);
      expect(item.jobId, 'job-123');
      expect(item.status, QueueStatus.SYNCED);
      expect(item.data['proofImageUrl'], 'https://cdn.example.com/proof.jpg');
    });

    test('fromMap handles RATE_JOB', () {
      final map = {
        'id': 'q-3',
        'action': 'RATE_JOB',
        'job_id': 'job-456',
        'data': '{"value":5,"comment":"Great service"}',
        'status': 'FAILED',
        'retry_count': 2,
        'error_message': 'Network timeout',
        'created_at': '2026-04-20T12:00:00.000',
        'updated_at': '2026-04-20T12:05:00.000',
      };

      final item = QueuedItem.fromMap(map);

      expect(item.action, QueueAction.RATE_JOB);
      expect(item.jobId, 'job-456');
      expect(item.status, QueueStatus.FAILED);
      expect(item.retryCount, 2);
      expect(item.errorMessage, 'Network timeout');
      expect(item.data['value'], 5);
      expect(item.data['comment'], 'Great service');
    });

    test('toMap serializes correctly', () {
      final item = QueuedItem(
        id: 'q-4',
        action: QueueAction.LOCATION_UPDATE,
        jobId: 'job-789',
        data: {'latitude': 4.0435, 'longitude': 9.6966},
        status: QueueStatus.PENDING,
        retryCount: 0,
        createdAt: DateTime(2026, 4, 20, 8, 0),
        updatedAt: DateTime(2026, 4, 20, 8, 0),
      );

      final map = item.toMap();

      expect(map['id'], 'q-4');
      expect(map['action'], 'LOCATION_UPDATE');
      expect(map['job_id'], 'job-789');
      expect(map['status'], 'PENDING');
      expect(map['retry_count'], 0);
    });

    test('copyWith creates updated copy', () {
      final item = QueuedItem(
        id: 'q-5',
        action: QueueAction.CREATE_JOB,
        data: {'scheduledDate': '2026-04-20'},
        status: QueueStatus.PENDING,
        createdAt: DateTime(2026, 4, 20),
        updatedAt: DateTime(2026, 4, 20),
      );

      final updated = item.copyWith(
        status: QueueStatus.SYNCED,
        updatedAt: DateTime(2026, 4, 20, 10),
      );

      expect(updated.id, item.id);
      expect(updated.action, item.action);
      expect(updated.status, QueueStatus.SYNCED);
      expect(updated.createdAt, item.createdAt);
      expect(updated.updatedAt, DateTime(2026, 4, 20, 10));
    });

    test('fromMap defaults unknown action to CREATE_JOB', () {
      final map = {
        'id': 'q-6',
        'action': 'UNKNOWN_ACTION',
        'job_id': null,
        'data': '{}',
        'status': 'PENDING',
        'retry_count': 0,
        'error_message': null,
        'created_at': '2026-04-20T08:00:00.000',
        'updated_at': '2026-04-20T08:00:00.000',
      };

      final item = QueuedItem.fromMap(map);
      expect(item.action, QueueAction.CREATE_JOB);
    });

    test('fromMap defaults unknown status to PENDING', () {
      final map = {
        'id': 'q-7',
        'action': 'CREATE_JOB',
        'job_id': null,
        'data': '{}',
        'status': 'INVALID',
        'retry_count': 0,
        'error_message': null,
        'created_at': '2026-04-20T08:00:00.000',
        'updated_at': '2026-04-20T08:00:00.000',
      };

      final item = QueuedItem.fromMap(map);
      expect(item.status, QueueStatus.PENDING);
    });
  });

  group('QueueAction', () {
    test('has all expected values', () {
      expect(QueueAction.values.length, 4);
      expect(QueueAction.values, contains(QueueAction.CREATE_JOB));
      expect(QueueAction.values, contains(QueueAction.COMPLETE_JOB));
      expect(QueueAction.values, contains(QueueAction.RATE_JOB));
      expect(QueueAction.values, contains(QueueAction.LOCATION_UPDATE));
    });
  });

  group('QueueStatus', () {
    test('has all expected values', () {
      expect(QueueStatus.values.length, 4);
      expect(QueueStatus.values, contains(QueueStatus.PENDING));
      expect(QueueStatus.values, contains(QueueStatus.SYNCING));
      expect(QueueStatus.values, contains(QueueStatus.SYNCED));
      expect(QueueStatus.values, contains(QueueStatus.FAILED));
    });
  });
}
