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

    testWidgets('displays correct label for REQUESTED', (tester) async {
      await tester.pumpWidget(buildBadge(JobStatus.REQUESTED));
      expect(find.text('Requested'), findsOneWidget);
    });

    testWidgets('displays correct label for ASSIGNED', (tester) async {
      await tester.pumpWidget(buildBadge(JobStatus.ASSIGNED));
      expect(find.text('Assigned'), findsOneWidget);
    });

    testWidgets('displays correct label for IN_PROGRESS', (tester) async {
      await tester.pumpWidget(buildBadge(JobStatus.IN_PROGRESS));
      expect(find.text('In Progress'), findsOneWidget);
    });

    testWidgets('displays correct label for COMPLETED', (tester) async {
      await tester.pumpWidget(buildBadge(JobStatus.COMPLETED));
      expect(find.text('Completed'), findsOneWidget);
    });

    testWidgets('displays correct label for VALIDATED', (tester) async {
      await tester.pumpWidget(buildBadge(JobStatus.VALIDATED));
      expect(find.text('Validated'), findsOneWidget);
    });

    testWidgets('displays correct label for RATED', (tester) async {
      await tester.pumpWidget(buildBadge(JobStatus.RATED));
      expect(find.text('Rated'), findsOneWidget);
    });

    testWidgets('displays correct label for CANCELLED', (tester) async {
      await tester.pumpWidget(buildBadge(JobStatus.CANCELLED));
      expect(find.text('Cancelled'), findsOneWidget);
    });

    testWidgets('displays correct label for DISPUTED', (tester) async {
      await tester.pumpWidget(buildBadge(JobStatus.DISPUTED));
      expect(find.text('Disputed'), findsOneWidget);
    });
  });
}
