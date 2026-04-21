import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:mocktail/mocktail.dart';
import 'package:wastewise/providers/jobs_provider.dart';
import 'package:wastewise/screens/jobs/create_job_screen.dart';
import 'package:wastewise/services/api/jobs_api.dart';
import 'package:wastewise/services/websocket/websocket_service.dart';

class MockJobsApi extends Mock implements JobsApi {}

class MockWebSocketService extends Mock implements WebSocketService {}

Widget buildTestWidget(JobsProvider provider) {
  return MaterialApp(
    home: ChangeNotifierProvider.value(
      value: provider,
      child: const CreateJobScreen(),
    ),
  );
}

void main() {
  late MockJobsApi mockJobsApi;
  late MockWebSocketService mockWsService;
  late JobsProvider provider;
  late StreamController<JobStatusUpdate> wsStreamController;

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

  group('CreateJobScreen', () {
    testWidgets('renders form fields', (tester) async {
      await tester.pumpWidget(buildTestWidget(provider));
      await tester.pumpAndSettle();

      // AppBar title
      expect(find.text('Schedule Collection'), findsWidgets);
      expect(find.text('Scheduled Date'), findsOneWidget);
      expect(find.text('Time Window'), findsOneWidget);
      expect(find.text('Pickup Address'), findsOneWidget);
      expect(find.text('Notes (optional)'), findsOneWidget);
    });

    testWidgets('validates empty address on submit', (tester) async {
      await tester.pumpWidget(buildTestWidget(provider));
      await tester.pumpAndSettle();

      // Scroll down to find the button and tap it
      await tester.dragUntilVisible(
        find.byType(ElevatedButton),
        find.byType(SingleChildScrollView),
        const Offset(0, -200),
      );
      await tester.tap(find.byType(ElevatedButton));
      await tester.pumpAndSettle();

      expect(find.text('Address is required'), findsOneWidget);
    });

    testWidgets('validates short address on submit', (tester) async {
      await tester.pumpWidget(buildTestWidget(provider));
      await tester.pumpAndSettle();

      await tester.enterText(
        find.widgetWithText(TextFormField, 'Pickup Address'),
        'AB',
      );

      await tester.dragUntilVisible(
        find.byType(ElevatedButton),
        find.byType(SingleChildScrollView),
        const Offset(0, -200),
      );
      await tester.tap(find.byType(ElevatedButton));
      await tester.pumpAndSettle();

      expect(find.text('Address must be at least 5 characters'), findsOneWidget);
    });

    testWidgets('shows date picker on date row tap', (tester) async {
      await tester.pumpWidget(buildTestWidget(provider));
      await tester.pumpAndSettle();

      await tester.tap(find.byIcon(Icons.calendar_today));
      await tester.pumpAndSettle();

      expect(find.byType(DatePickerDialog), findsOneWidget);
    });
  });
}
