import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:wastewise/providers/app_update_provider.dart';
import 'package:wastewise/services/api/app_update_api.dart';

class MockAppUpdateApi extends Mock implements AppUpdateApi {}

AppUpdateInfo _noUpdate() => AppUpdateInfo.noUpdate();
AppUpdateInfo _optionalUpdate() => const AppUpdateInfo(
      updateAvailable: true,
      forceUpdate: false,
      latestVersion: '2.0.0',
      latestBuild: 100,
      minSupportedBuild: 80,
      title: 'Update Available',
      message: 'A new version is ready.',
      storeUrl: 'https://play.google.com/store',
    );
AppUpdateInfo _forceUpdate() => const AppUpdateInfo(
      updateAvailable: true,
      forceUpdate: true,
      latestVersion: '2.0.0',
      latestBuild: 100,
      minSupportedBuild: 90,
      title: 'Update Required',
      message: 'Please update now.',
      storeUrl: 'https://play.google.com/store',
    );

void main() {
  late MockAppUpdateApi mockApi;
  late AppUpdateProvider provider;

  setUp(() {
    mockApi = MockAppUpdateApi();
    provider = AppUpdateProvider(
      api: mockApi,
      platform: 'ANDROID',
      appType: 'HOUSEHOLD',
    );
  });

  tearDown(() {
    provider.dispose();
  });

  // ─── Initial state ─────────────────────────────────────────────

  group('initial state', () {
    test('has no update info on creation', () {
      expect(provider.updateInfo, isNull);
      expect(provider.hasForceUpdate, isFalse);
      expect(provider.hasOptionalUpdate, isFalse);
    });
  });

  // ─── checkForUpdate ────────────────────────────────────────────

  group('checkForUpdate', () {
    test('sets updateInfo and notifies listeners on success', () async {
      when(() => mockApi.checkUpdate(
            platform: any(named: 'platform'),
            appType: any(named: 'appType'),
          )).thenAnswer((_) async => _optionalUpdate());

      bool notified = false;
      provider.addListener(() => notified = true);

      await provider.checkForUpdate();

      expect(provider.updateInfo, isNotNull);
      expect(provider.hasOptionalUpdate, isTrue);
      expect(provider.hasForceUpdate, isFalse);
      expect(notified, isTrue);
    });

    test('sets hasForceUpdate when forceUpdate is true', () async {
      when(() => mockApi.checkUpdate(
            platform: any(named: 'platform'),
            appType: any(named: 'appType'),
          )).thenAnswer((_) async => _forceUpdate());

      await provider.checkForUpdate();

      expect(provider.hasForceUpdate, isTrue);
      expect(provider.hasOptionalUpdate, isFalse);
    });

    test('sets no update flags when no update available', () async {
      when(() => mockApi.checkUpdate(
            platform: any(named: 'platform'),
            appType: any(named: 'appType'),
          )).thenAnswer((_) async => _noUpdate());

      await provider.checkForUpdate();

      expect(provider.hasForceUpdate, isFalse);
      expect(provider.hasOptionalUpdate, isFalse);
    });

    test('skips API call on second call (already checked)', () async {
      when(() => mockApi.checkUpdate(
            platform: any(named: 'platform'),
            appType: any(named: 'appType'),
          )).thenAnswer((_) async => _noUpdate());

      await provider.checkForUpdate();
      await provider.checkForUpdate(); // second call, should be skipped

      verify(() => mockApi.checkUpdate(
            platform: any(named: 'platform'),
            appType: any(named: 'appType'),
          )).called(1);
    });

    test('forces re-check when force=true', () async {
      when(() => mockApi.checkUpdate(
            platform: any(named: 'platform'),
            appType: any(named: 'appType'),
          )).thenAnswer((_) async => _noUpdate());

      await provider.checkForUpdate();
      await provider.checkForUpdate(force: true);

      verify(() => mockApi.checkUpdate(
            platform: any(named: 'platform'),
            appType: any(named: 'appType'),
          )).called(2);
    });
  });

  // ─── updateAppType ─────────────────────────────────────────────

  group('updateAppType', () {
    test('triggers re-check when appType changes', () async {
      when(() => mockApi.checkUpdate(
            platform: any(named: 'platform'),
            appType: any(named: 'appType'),
          )).thenAnswer((_) async => _noUpdate());

      await provider.checkForUpdate(); // initial check as HOUSEHOLD
      provider.updateAppType('COLLECTOR'); // change to COLLECTOR

      // Wait for async re-check triggered by updateAppType
      await Future<void>.delayed(Duration.zero);

      verify(() => mockApi.checkUpdate(
            platform: any(named: 'platform'),
            appType: any(named: 'appType'),
          )).called(2);
    });

    test('no-ops when appType is the same', () async {
      when(() => mockApi.checkUpdate(
            platform: any(named: 'platform'),
            appType: any(named: 'appType'),
          )).thenAnswer((_) async => _noUpdate());

      await provider.checkForUpdate();
      provider.updateAppType('HOUSEHOLD'); // same type, no change

      await Future<void>.delayed(Duration.zero);

      verify(() => mockApi.checkUpdate(
            platform: any(named: 'platform'),
            appType: any(named: 'appType'),
          )).called(1); // still only 1 call
    });

    test('maps COLLECTOR role correctly', () async {
      String? capturedAppType;
      when(() => mockApi.checkUpdate(
            platform: any(named: 'platform'),
            appType: any(named: 'appType'),
          )).thenAnswer((invocation) async {
        capturedAppType = invocation.namedArguments[#appType] as String;
        return _noUpdate();
      });

      provider.updateAppType('COLLECTOR');
      await Future<void>.delayed(Duration.zero);

      expect(capturedAppType, 'COLLECTOR');
    });

    test('maps MARKETER role correctly', () async {
      String? capturedAppType;
      when(() => mockApi.checkUpdate(
            platform: any(named: 'platform'),
            appType: any(named: 'appType'),
          )).thenAnswer((invocation) async {
        capturedAppType = invocation.namedArguments[#appType] as String;
        return _noUpdate();
      });

      provider.updateAppType('MARKETER');
      await Future<void>.delayed(Duration.zero);

      expect(capturedAppType, 'MARKETER');
    });
  });

  // ─── listenToWebSocket ─────────────────────────────────────────

  group('listenToWebSocket', () {
    test('triggers force re-check when app:update event received', () async {
      when(() => mockApi.checkUpdate(
            platform: any(named: 'platform'),
            appType: any(named: 'appType'),
          )).thenAnswer((_) async => _optionalUpdate());

      final controller = StreamController<Map<String, dynamic>>.broadcast();
      provider.listenToWebSocket(controller.stream);

      // Initial check to set _checked = true
      await provider.checkForUpdate();

      // Simulate receiving a WS app:update event
      controller.add({'updateType': 'OPTIONAL', 'versionName': '2.0.0'});
      await Future<void>.delayed(Duration.zero);

      // Should have called API twice (initial + WS-triggered force re-check)
      verify(() => mockApi.checkUpdate(
            platform: any(named: 'platform'),
            appType: any(named: 'appType'),
          )).called(2);

      await controller.close();
    });

    test('cancels previous subscription when called again', () async {
      when(() => mockApi.checkUpdate(
            platform: any(named: 'platform'),
            appType: any(named: 'appType'),
          )).thenAnswer((_) async => _noUpdate());

      final controller1 = StreamController<Map<String, dynamic>>.broadcast();
      final controller2 = StreamController<Map<String, dynamic>>.broadcast();

      provider.listenToWebSocket(controller1.stream);
      provider.listenToWebSocket(controller2.stream); // replaces controller1

      // Event on old stream should NOT trigger check
      controller1.add({});
      await Future<void>.delayed(Duration.zero);

      verifyNever(() => mockApi.checkUpdate(
            platform: any(named: 'platform'),
            appType: any(named: 'appType'),
          ));

      await controller1.close();
      await controller2.close();
    });
  });

  // ─── reset ─────────────────────────────────────────────────────

  group('reset', () {
    test('clears updateInfo and allows re-check', () async {
      when(() => mockApi.checkUpdate(
            platform: any(named: 'platform'),
            appType: any(named: 'appType'),
          )).thenAnswer((_) async => _optionalUpdate());

      await provider.checkForUpdate();
      expect(provider.updateInfo, isNotNull);

      provider.reset();

      expect(provider.updateInfo, isNull);
      expect(provider.hasForceUpdate, isFalse);
      expect(provider.hasOptionalUpdate, isFalse);

      // Should allow a fresh check after reset
      await provider.checkForUpdate();
      verify(() => mockApi.checkUpdate(
            platform: any(named: 'platform'),
            appType: any(named: 'appType'),
          )).called(2);
    });
  });
}
