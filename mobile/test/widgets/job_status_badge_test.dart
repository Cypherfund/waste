import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wastewise/models/job.dart';
import 'package:wastewise/widgets/job_status_badge.dart';

void main() {
  group('JobStatusBadge', () {
    Widget buildBadge(JobStatus status) {
      return MaterialApp(
        home: Scaffold(body: JobStatusBadge(status: status)),
      );
    }

    testWidgets('displays correct label for requested', (tester) async {
      await tester.pumpWidget(buildBadge(JobStatus.requested));
      expect(find.text('Requested'), findsOneWidget);
    });

    testWidgets('displays correct label for assigned', (tester) async {
      await tester.pumpWidget(buildBadge(JobStatus.assigned));
      expect(find.text('Assigned'), findsOneWidget);
    });

    testWidgets('displays correct label for inProgress', (tester) async {
      await tester.pumpWidget(buildBadge(JobStatus.inProgress));
      expect(find.text('In Progress'), findsOneWidget);
    });

    testWidgets('displays correct label for completed', (tester) async {
      await tester.pumpWidget(buildBadge(JobStatus.completed));
      expect(find.text('Completed'), findsOneWidget);
    });

    testWidgets('displays correct label for validated', (tester) async {
      await tester.pumpWidget(buildBadge(JobStatus.validated));
      expect(find.text('Validated'), findsOneWidget);
    });

    testWidgets('displays correct label for rated', (tester) async {
      await tester.pumpWidget(buildBadge(JobStatus.rated));
      expect(find.text('Rated'), findsOneWidget);
    });

    testWidgets('displays correct label for cancelled', (tester) async {
      await tester.pumpWidget(buildBadge(JobStatus.cancelled));
      expect(find.text('Cancelled'), findsOneWidget);
    });

    testWidgets('displays correct label for disputed', (tester) async {
      await tester.pumpWidget(buildBadge(JobStatus.disputed));
      expect(find.text('Disputed'), findsOneWidget);
    });
  });
}
