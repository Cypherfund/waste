import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../../config/app_config.dart';
import '../../models/job.dart';

class JobStatusUpdate {
  final String jobId;
  final JobStatus status;
  final String? collectorId;
  final DateTime updatedAt;

  JobStatusUpdate({
    required this.jobId,
    required this.status,
    this.collectorId,
    required this.updatedAt,
  });

  factory JobStatusUpdate.fromJson(Map<String, dynamic> json) {
    return JobStatusUpdate(
      jobId: json['jobId'] as String,
      status: JobStatus.fromString(json['status'] as String),
      collectorId: json['collectorId'] as String?,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : DateTime.now(),
    );
  }
}

class CollectorAssignedEvent {
  final String jobId;
  final JobStatus status;
  final String? householdId;
  final DateTime updatedAt;

  CollectorAssignedEvent({
    required this.jobId,
    required this.status,
    this.householdId,
    required this.updatedAt,
  });

  factory CollectorAssignedEvent.fromJson(Map<String, dynamic> json) {
    return CollectorAssignedEvent(
      jobId: json['jobId'] as String,
      status: JobStatus.fromString(json['status'] as String),
      householdId: json['householdId'] as String?,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : DateTime.now(),
    );
  }
}

class JobLocationUpdate {
  final String jobId;
  final double collectorLat;
  final double collectorLng;
  final double accuracy;
  final DateTime updatedAt;

  JobLocationUpdate({
    required this.jobId,
    required this.collectorLat,
    required this.collectorLng,
    required this.accuracy,
    required this.updatedAt,
  });

  factory JobLocationUpdate.fromJson(Map<String, dynamic> json) {
    return JobLocationUpdate(
      jobId: json['jobId'] as String,
      collectorLat: (json['collectorLat'] as num).toDouble(),
      collectorLng: (json['collectorLng'] as num).toDouble(),
      accuracy: (json['accuracy'] as num).toDouble(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : DateTime.now(),
    );
  }
}

class WebSocketService {
  io.Socket? _socket;
  String? _currentUserId;
  String? _currentRole;
  final _jobStatusController = StreamController<JobStatusUpdate>.broadcast();
  final _collectorAssignedController =
      StreamController<CollectorAssignedEvent>.broadcast();
  final _jobLocationController =
      StreamController<JobLocationUpdate>.broadcast();

  Stream<JobStatusUpdate> get jobStatusStream => _jobStatusController.stream;
  Stream<CollectorAssignedEvent> get collectorAssignedStream =>
      _collectorAssignedController.stream;
  Stream<JobLocationUpdate> get jobLocationStream =>
      _jobLocationController.stream;

  bool get isConnected => _socket?.connected ?? false;

  void connect({
    required String accessToken,
    required String userId,
    String role = 'HOUSEHOLD',
  }) {
    _currentUserId = userId;
    _currentRole = role;

    _socket?.dispose();

    _socket = io.io(
      '${AppConfig.wsBaseUrl}${AppConfig.wsNamespace}',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': accessToken})
          .disableAutoConnect()
          .build(),
    );

    _socket!.onConnect((_) {
      debugPrint('[WS] Connected as $role');
      if (role == 'COLLECTOR') {
        _subscribeToChannel('collector:$userId');
      } else {
        _subscribeToChannel('household:$userId');
      }
    });

    _socket!.onDisconnect((reason) {
      debugPrint('[WS] Disconnected: $reason');
    });

    _socket!.on('reconnect', (_) {
      debugPrint('[WS] Reconnected');
    });

    _socket!.onConnectError((error) {
      debugPrint('[WS] Connection error: $error');
    });

    _socket!.on('error', (data) {
      debugPrint('[WS] Error: $data');
    });

    _socket!.on('job:status', (data) {
      try {
        final update = JobStatusUpdate.fromJson(data as Map<String, dynamic>);
        _jobStatusController.add(update);
      } catch (e) {
        debugPrint('[WS] Failed to parse job status: $e');
      }
    });

    _socket!.on('collector:assigned', (data) {
      try {
        final event =
            CollectorAssignedEvent.fromJson(data as Map<String, dynamic>);
        _collectorAssignedController.add(event);
      } catch (e) {
        debugPrint('[WS] Failed to parse collector:assigned: $e');
      }
    });

    _socket!.on('job:location', (data) {
      try {
        final update =
            JobLocationUpdate.fromJson(data as Map<String, dynamic>);
        _jobLocationController.add(update);
      } catch (e) {
        debugPrint('[WS] Failed to parse job:location: $e');
      }
    });

    _socket!.on('subscribed', (data) {
      debugPrint('[WS] Subscribed to channel: ${data['channel']}');
    });

    _socket!.on('location:ack', (data) {
      debugPrint('[WS] Location ack for job: ${data['jobId']}');
    });

    _socket!.connect();
  }

  void subscribeToJob(String jobId) {
    _subscribeToChannel('job:$jobId');
  }

  void unsubscribeFromJob(String jobId) {
    _socket?.emit('unsubscribe', {'channel': 'job:$jobId'});
  }

  void emitLocationUpdate({
    required String jobId,
    required double latitude,
    required double longitude,
    required double accuracy,
    double? speed,
    double? heading,
  }) {
    _socket?.emit('location:update', {
      'jobId': jobId,
      'latitude': latitude,
      'longitude': longitude,
      'accuracy': accuracy,
      if (speed != null) 'speed': speed,
      if (heading != null) 'heading': heading,
    });
  }

  void _subscribeToChannel(String channel) {
    _socket?.emit('subscribe', {'channel': channel});
  }

  void disconnect() {
    if (_currentUserId != null && _currentRole != null) {
      final prefix =
          _currentRole == 'COLLECTOR' ? 'collector' : 'household';
      _socket?.emit('unsubscribe', {'channel': '$prefix:$_currentUserId'});
    }
    _socket?.dispose();
    _socket = null;
    _currentUserId = null;
    _currentRole = null;
  }

  void dispose() {
    disconnect();
    _jobStatusController.close();
    _collectorAssignedController.close();
    _jobLocationController.close();
  }
}
