import 'dart:async';
import 'package:flutter/foundation.dart';
import 'offline_queue_service.dart';
import 'connectivity_service.dart';
import '../api/jobs_api.dart';
import '../api/api_client.dart';

enum SyncStatus { idle, syncing, completed, error }

class SyncResult {
  final int total;
  final int synced;
  final int failed;
  final List<String> errors;

  SyncResult({
    required this.total,
    required this.synced,
    required this.failed,
    this.errors = const [],
  });
}

class SyncService {
  final OfflineQueueService _queueService;
  final ConnectivityService _connectivityService;
  final JobsApi _jobsApi;

  StreamSubscription? _connectivitySub;
  Timer? _retryTimer;
  bool _isSyncing = false;

  final _statusController = StreamController<SyncStatus>.broadcast();
  final _resultController = StreamController<SyncResult>.broadcast();

  SyncService({
    required OfflineQueueService queueService,
    required ConnectivityService connectivityService,
    required JobsApi jobsApi,
  })  : _queueService = queueService,
        _connectivityService = connectivityService,
        _jobsApi = jobsApi;

  Stream<SyncStatus> get statusStream => _statusController.stream;
  Stream<SyncResult> get resultStream => _resultController.stream;
  bool get isSyncing => _isSyncing;

  void initialize() {
    _connectivitySub =
        _connectivityService.onConnectivityChanged.listen((isOnline) {
      if (isOnline) {
        debugPrint('[Sync] Online — triggering sync');
        syncPendingItems();
      }
    });

    // Initial sync if online
    if (_connectivityService.isOnline) {
      Future.delayed(const Duration(seconds: 2), () => syncPendingItems());
    }
  }

  Future<SyncResult> syncPendingItems() async {
    if (_isSyncing) {
      return SyncResult(total: 0, synced: 0, failed: 0);
    }

    if (!_connectivityService.isOnline) {
      debugPrint('[Sync] Offline — skipping sync');
      return SyncResult(total: 0, synced: 0, failed: 0);
    }

    _isSyncing = true;
    _statusController.add(SyncStatus.syncing);

    final pending = await _queueService.getPendingItems();

    if (pending.isEmpty) {
      _isSyncing = false;
      _statusController.add(SyncStatus.idle);
      return SyncResult(total: 0, synced: 0, failed: 0);
    }

    debugPrint('[Sync] Processing ${pending.length} pending items');

    int synced = 0;
    int failed = 0;
    final errors = <String>[];

    for (final item in pending) {
      if (!_connectivityService.isOnline) {
        debugPrint('[Sync] Lost connectivity — stopping');
        break;
      }

      try {
        await _queueService.markSyncing(item.id);
        await _processItem(item);
        await _queueService.markSynced(item.id);
        synced++;
      } catch (e) {
        final errorMsg = ApiClient.extractErrorMessage(e);
        await _queueService.markFailed(item.id, errorMsg);
        failed++;
        errors.add('${item.action.name}: $errorMsg');
        debugPrint('[Sync] Failed item ${item.id}: $errorMsg');
      }
    }

    _isSyncing = false;

    final result = SyncResult(
      total: pending.length,
      synced: synced,
      failed: failed,
      errors: errors,
    );

    _resultController.add(result);

    if (failed > 0) {
      _statusController.add(SyncStatus.error);
      _scheduleRetry();
    } else {
      _statusController.add(SyncStatus.completed);
      // Clean up synced items after a delay
      Future.delayed(const Duration(seconds: 5), () {
        _queueService.clearSynced();
        _statusController.add(SyncStatus.idle);
      });
    }

    debugPrint('[Sync] Complete: $synced synced, $failed failed');
    return result;
  }

  Future<void> _processItem(QueuedItem item) async {
    switch (item.action) {
      case QueueAction.CREATE_JOB:
        await _processCreateJob(item);
        break;
      case QueueAction.COMPLETE_JOB:
        await _processCompleteJob(item);
        break;
      case QueueAction.RATE_JOB:
        await _processRateJob(item);
        break;
      case QueueAction.LOCATION_UPDATE:
        // Location updates are best-effort, just mark as synced
        break;
    }
  }

  Future<void> _processCreateJob(QueuedItem item) async {
    final data = item.data;
    await _jobsApi.createJob(
      scheduledDate: data['scheduledDate'] as String,
      scheduledTime: data['scheduledTime'] as String,
      locationAddress: data['locationAddress'] as String,
      locationLat: (data['locationLat'] as num?)?.toDouble(),
      locationLng: (data['locationLng'] as num?)?.toDouble(),
      notes: data['notes'] as String?,
    );
  }

  Future<void> _processCompleteJob(QueuedItem item) async {
    final data = item.data;
    final jobId = item.jobId!;
    await _jobsApi.completeJob(
      jobId,
      proofImageUrl: data['proofImageUrl'] as String,
      collectorLat: (data['collectorLat'] as num?)?.toDouble(),
      collectorLng: (data['collectorLng'] as num?)?.toDouble(),
    );
  }

  Future<void> _processRateJob(QueuedItem item) async {
    final data = item.data;
    final jobId = item.jobId!;
    await _jobsApi.rateJob(
      jobId,
      value: data['value'] as int,
      comment: data['comment'] as String?,
    );
  }

  void _scheduleRetry() {
    _retryTimer?.cancel();
    _retryTimer = Timer(const Duration(seconds: 30), () {
      if (_connectivityService.isOnline) {
        syncPendingItems();
      }
    });
  }

  Future<void> retryNow() async {
    _retryTimer?.cancel();
    await _queueService.resetFailed();
    await syncPendingItems();
  }

  void dispose() {
    _connectivitySub?.cancel();
    _retryTimer?.cancel();
    _statusController.close();
    _resultController.close();
  }
}
