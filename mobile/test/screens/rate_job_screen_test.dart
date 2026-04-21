import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:mocktail/mocktail.dart';
import 'package:wastewise/models/job.dart';
import 'package:wastewise/providers/jobs_provider.dart';
import 'package:wastewise/screens/jobs/rate_job_screen.dart';
import 'package:wastewise/services/api/jobs_api.dart';
import 'package:wastewise/services/websocket/websocket_service.dart';

class MockJobsApi extends Mock implements JobsApi {}

class MockWebSocketService extends Mock implements WebSocketService {}

void main() {
  late MockJobsApi mockJobsApi;
  late MockWebSocketService mockWsService;
  late JobsProvider provider;
  late StreamController<JobStatusUpdate> wsStreamController;

  final testJob = Job(
    id: 'job-1',
    householdId: 'hh-1',
    collectorId: 'col-1',
    collectorName: 'Collector One',
    status: JobStatus.VALIDATED,
    scheduledDate: '2026-04-25',
    scheduledTime: '08:00-10:00',
    locationAddress: 'Test Address, Douala',
    createdAt: DateTime(2026, 4, 20),
    updatedAt: DateTime(2026, 4, 20),
  );

  setUp(() {
    mockJobsApi = MockJobsApi();
    mockWsService = MockWebSocketService();
    wsStreamController = StreamController<JobStatusUpdate>.broadcast();

    when(() => mockWsService.jobStatusStream)
        .thenAnswer((_) => wsStreamController.stream);
    when(() => mockWsService.subscribeToJob(any())).thenReturn(null);

    provider = JobsProvider(
      jobsApi: mockJobsApi,
      wsService: mockWsService,
    );
  });

  tearDown(() {
    wsStreamController.close();
    provider.dispose();
  });

  group('RateJobScreen', () {
    testWidgets('renders rating form with job info', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: ChangeNotifierProvider.value(
          value: provider,
          child: Builder(
            builder: (context) => Scaffold(
              body: ElevatedButton(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    settings: RouteSettings(arguments: testJob),
                    builder: (_) => ChangeNotifierProvider.value(
                      value: provider,
                      child: const RateJobScreen(),
                    ),
                  ),
                ),
                child: const Text('Go'),
              ),
            ),
          ),
        ),
      ));

      await tester.tap(find.text('Go'));
      await tester.pumpAndSettle();

      expect(find.text('Rate Collector'), findsOneWidget);
      expect(find.text('Test Address, Douala'), findsOneWidget);
      expect(find.text('Collector: Collector One'), findsOneWidget);
      expect(find.text('How was the service?'), findsOneWidget);
      expect(find.text('Submit Rating'), findsOneWidget);
      expect(find.byIcon(Icons.star_border), findsNWidgets(5));
    });

    testWidgets('shows snackbar when no star selected', (tester) async {
      await tester.pumpWidget(MaterialApp(
        home: ChangeNotifierProvider.value(
          value: provider,
          child: Builder(
            builder: (context) => Scaffold(
              body: ElevatedButton(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    settings: RouteSettings(arguments: testJob),
                    builder: (_) => ChangeNotifierProvider.value(
                      value: provider,
                      child: const RateJobScreen(),
                    ),
                  ),
                ),
                child: const Text('Go'),
              ),
            ),
          ),
        ),
      ));

      await tester.tap(find.text('Go'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Submit Rating'));
      await tester.pumpAndSettle();

      expect(find.text('Please select a rating'), findsOneWidget);
    });
  });
}
