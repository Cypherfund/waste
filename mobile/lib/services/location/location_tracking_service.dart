import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import '../websocket/websocket_service.dart';

class LocationTrackingService {
  final WebSocketService _wsService;
  Timer? _timer;
  String? _activeJobId;
  static const _intervalSeconds = 15;

  LocationTrackingService({required WebSocketService wsService})
      : _wsService = wsService;

  bool get isTracking => _timer != null && _activeJobId != null;
  String? get activeJobId => _activeJobId;

  Future<bool> startTracking(String jobId) async {
    if (_activeJobId == jobId && _timer != null) return true;

    final hasPermission = await _checkPermission();
    if (!hasPermission) return false;

    _activeJobId = jobId;
    await _sendLocationUpdate();

    _timer?.cancel();
    _timer = Timer.periodic(
      const Duration(seconds: _intervalSeconds),
      (_) => _sendLocationUpdate(),
    );

    debugPrint('[Location] Tracking started for job $jobId');
    return true;
  }

  void stopTracking() {
    _timer?.cancel();
    _timer = null;
    final jobId = _activeJobId;
    _activeJobId = null;
    debugPrint('[Location] Tracking stopped for job $jobId');
  }

  Future<void> _sendLocationUpdate() async {
    if (_activeJobId == null) return;

    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      _wsService.emitLocationUpdate(
        jobId: _activeJobId!,
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        speed: position.speed > 0 ? position.speed : null,
        heading: position.heading > 0 ? position.heading : null,
      );

      debugPrint(
        '[Location] Sent: ${position.latitude}, ${position.longitude} '
        '(accuracy: ${position.accuracy}m)',
      );
    } catch (e) {
      debugPrint('[Location] Failed to get position: $e');
    }
  }

  Future<bool> _checkPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      debugPrint('[Location] Location services disabled');
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        debugPrint('[Location] Permission denied');
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      debugPrint('[Location] Permission permanently denied');
      return false;
    }

    return true;
  }

  void dispose() {
    stopTracking();
  }
}
