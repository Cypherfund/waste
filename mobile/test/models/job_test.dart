import 'package:flutter_test/flutter_test.dart';
import 'package:wastewise/models/job.dart';

void main() {
  group('JobStatus', () {
    test('fromString parses valid status', () {
      expect(JobStatus.fromString('REQUESTED'), JobStatus.requested);
      expect(JobStatus.fromString('ASSIGNED'), JobStatus.assigned);
      expect(JobStatus.fromString('IN_PROGRESS'), JobStatus.inProgress);
      expect(JobStatus.fromString('COMPLETED'), JobStatus.completed);
      expect(JobStatus.fromString('VALIDATED'), JobStatus.validated);
      expect(JobStatus.fromString('RATED'), JobStatus.rated);
      expect(JobStatus.fromString('CANCELLED'), JobStatus.cancelled);
    });

    test('fromString defaults to REQUESTED for unknown value', () {
      expect(JobStatus.fromString('UNKNOWN'), JobStatus.requested);
    });
  });

  group('Job model', () {
    final json = {
      'id': 'job-1',
      'householdId': 'hh-1',
      'householdName': 'John Doe',
      'collectorId': 'col-1',
      'collectorName': 'Collector One',
      'status': 'ASSIGNED',
      'scheduledDate': '2026-04-25',
      'scheduledTime': '08:00-10:00',
      'locationAddress': 'Rue de la Joie, Akwa, Douala',
      'locationLat': 4.0435,
      'locationLng': 9.6966,
      'notes': 'Blue gate',
      'assignedAt': '2026-04-20T12:00:00.000Z',
      'startedAt': null,
      'completedAt': null,
      'validatedAt': null,
      'cancelledAt': null,
      'createdAt': '2026-04-20T10:00:00.000Z',
      'updatedAt': '2026-04-20T12:00:00.000Z',
    };

    test('fromJson creates Job correctly', () {
      final job = Job.fromJson(json);
      expect(job.id, 'job-1');
      expect(job.householdId, 'hh-1');
      expect(job.collectorName, 'Collector One');
      expect(job.status, JobStatus.assigned);
      expect(job.locationAddress, 'Rue de la Joie, Akwa, Douala');
      expect(job.locationLat, 4.0435);
      expect(job.notes, 'Blue gate');
      expect(job.assignedAt, isNotNull);
      expect(job.startedAt, isNull);
    });

    test('isActive returns true for REQUESTED, ASSIGNED, IN_PROGRESS', () {
      expect(Job.fromJson({...json, 'status': 'REQUESTED'}).isActive, true);
      expect(Job.fromJson({...json, 'status': 'ASSIGNED'}).isActive, true);
      expect(Job.fromJson({...json, 'status': 'IN_PROGRESS'}).isActive, true);
      expect(Job.fromJson({...json, 'status': 'COMPLETED'}).isActive, false);
    });

    test('canCancel returns true only for REQUESTED/ASSIGNED', () {
      expect(Job.fromJson({...json, 'status': 'REQUESTED'}).canCancel, true);
      expect(Job.fromJson({...json, 'status': 'ASSIGNED'}).canCancel, true);
      expect(Job.fromJson({...json, 'status': 'IN_PROGRESS'}).canCancel, false);
    });

    test('canValidate returns true only for COMPLETED', () {
      expect(Job.fromJson({...json, 'status': 'COMPLETED'}).canValidate, true);
      expect(Job.fromJson({...json, 'status': 'ASSIGNED'}).canValidate, false);
    });

    test('canRate returns true only for VALIDATED', () {
      expect(Job.fromJson({...json, 'status': 'VALIDATED'}).canRate, true);
      expect(Job.fromJson({...json, 'status': 'COMPLETED'}).canRate, false);
    });

    test('isTerminal returns true for RATED/CANCELLED', () {
      expect(Job.fromJson({...json, 'status': 'RATED'}).isTerminal, true);
      expect(Job.fromJson({...json, 'status': 'CANCELLED'}).isTerminal, true);
      expect(Job.fromJson({...json, 'status': 'COMPLETED'}).isTerminal, false);
    });

    test('copyWith creates updated copy', () {
      final job = Job.fromJson(json);
      final updated = job.copyWith(status: JobStatus.inProgress);
      expect(updated.status, JobStatus.inProgress);
      expect(updated.id, job.id);
      expect(updated.locationAddress, job.locationAddress);
    });
  });

  group('PaginatedJobs', () {
    test('fromJson parses paginated response', () {
      final json = {
        'data': [
          {
            'id': 'job-1',
            'householdId': 'hh-1',
            'status': 'REQUESTED',
            'scheduledDate': '2026-04-25',
            'scheduledTime': '08:00-10:00',
            'locationAddress': 'Test Address',
            'locationLat': null,
            'locationLng': null,
            'notes': null,
            'collectorId': null,
            'collectorName': null,
            'householdName': null,
            'assignedAt': null,
            'startedAt': null,
            'completedAt': null,
            'validatedAt': null,
            'cancelledAt': null,
            'createdAt': '2026-04-20T10:00:00.000Z',
            'updatedAt': '2026-04-20T10:00:00.000Z',
          }
        ],
        'meta': {
          'page': 1,
          'limit': 20,
          'total': 1,
          'pages': 1,
        },
      };

      final result = PaginatedJobs.fromJson(json);
      expect(result.data.length, 1);
      expect(result.page, 1);
      expect(result.total, 1);
      expect(result.pages, 1);
      expect(result.data.first.id, 'job-1');
    });
  });
}
