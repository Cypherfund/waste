import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:wastewise/services/offline/connectivity_service.dart';

class MockConnectivity extends Mock implements Connectivity {}

void main() {
  late MockConnectivity mockConnectivity;
  late ConnectivityService service;
  late StreamController<List<ConnectivityResult>> connectivityController;

  setUp(() {
    mockConnectivity = MockConnectivity();
    connectivityController = StreamController<List<ConnectivityResult>>.broadcast();

    when(() => mockConnectivity.onConnectivityChanged)
        .thenAnswer((_) => connectivityController.stream);
  });

  tearDown(() {
    connectivityController.close();
    service.dispose();
  });

  group('ConnectivityService', () {
    test('initializes as online when wifi connected', () async {
      when(() => mockConnectivity.checkConnectivity())
          .thenAnswer((_) async => [ConnectivityResult.wifi]);

      service = ConnectivityService(connectivity: mockConnectivity);
      await service.initialize();

      expect(service.isOnline, true);
    });

    test('initializes as online when mobile connected', () async {
      when(() => mockConnectivity.checkConnectivity())
          .thenAnswer((_) async => [ConnectivityResult.mobile]);

      service = ConnectivityService(connectivity: mockConnectivity);
      await service.initialize();

      expect(service.isOnline, true);
    });

    test('initializes as offline when no connection', () async {
      when(() => mockConnectivity.checkConnectivity())
          .thenAnswer((_) async => [ConnectivityResult.none]);

      service = ConnectivityService(connectivity: mockConnectivity);
      await service.initialize();

      expect(service.isOnline, false);
    });

    test('emits true when connectivity changes to wifi', () async {
      when(() => mockConnectivity.checkConnectivity())
          .thenAnswer((_) async => [ConnectivityResult.none]);

      service = ConnectivityService(connectivity: mockConnectivity);
      await service.initialize();
      expect(service.isOnline, false);

      final events = <bool>[];
      service.onConnectivityChanged.listen(events.add);

      connectivityController.add([ConnectivityResult.wifi]);
      await Future.delayed(const Duration(milliseconds: 50));

      expect(service.isOnline, true);
      expect(events, [true]);
    });

    test('emits false when connectivity changes to none', () async {
      when(() => mockConnectivity.checkConnectivity())
          .thenAnswer((_) async => [ConnectivityResult.wifi]);

      service = ConnectivityService(connectivity: mockConnectivity);
      await service.initialize();
      expect(service.isOnline, true);

      final events = <bool>[];
      service.onConnectivityChanged.listen(events.add);

      connectivityController.add([ConnectivityResult.none]);
      await Future.delayed(const Duration(milliseconds: 50));

      expect(service.isOnline, false);
      expect(events, [false]);
    });

    test('does not emit when status stays the same', () async {
      when(() => mockConnectivity.checkConnectivity())
          .thenAnswer((_) async => [ConnectivityResult.wifi]);

      service = ConnectivityService(connectivity: mockConnectivity);
      await service.initialize();

      final events = <bool>[];
      service.onConnectivityChanged.listen(events.add);

      connectivityController.add([ConnectivityResult.mobile]);
      await Future.delayed(const Duration(milliseconds: 50));

      // Still online (wifi -> mobile), no event emitted
      expect(service.isOnline, true);
      expect(events, isEmpty);
    });
  });
}
