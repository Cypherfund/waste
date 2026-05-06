import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:mocktail/mocktail.dart';
import 'package:wastewise/providers/jobs_provider.dart';
import 'package:wastewise/screens/jobs/create_job_screen.dart';
import 'package:wastewise/widgets/app_text_field.dart';
import 'package:wastewise/services/api/job_api.dart';
import 'package:wastewise/services/websocket/websocket_service.dart';

class MockJobApi extends Mock implements JobApi {}

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
  late MockJobApi mockJobApi;
  late MockWebSocketService mockWsService;
  late JobsProvider provider;
  late StreamController<JobStatusUpdate> wsStreamController;

  setUp(() {
    mockJobApi = MockJobApi();
    mockWsService = MockWebSocketService();
    wsStreamController = StreamController<JobStatusUpdate>.broadcast();

    when(() => mockWsService.jobStatusStream)
        .thenAnswer((_) => wsStreamController.stream);
    when(() => mockWsService.subscribeToJob(any())).thenReturn(null);

    provider = JobsProvider(
      jobsApi: mockJobApi,
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
      expect(find.text('Select a date'), findsOneWidget);
      expect(find.text('Select a time slot'), findsOneWidget);
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
        find.widgetWithText(AppTextField, 'Address'),
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
