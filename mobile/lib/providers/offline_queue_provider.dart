import 'dart:async';
import 'package:flutter/foundation.dart';
import '../services/offline/offline_queue_service.dart';
import '../services/offline/connectivity_service.dart';
import '../services/offline/sync_service.dart';

class OfflineQueueProvider extends ChangeNotifier {
  final OfflineQueueService _queueService;
  final ConnectivityService _connectivityService;
  final SyncService _syncService;

  List<QueuedItem> _items = [];
  int _pendingCount = 0;
  bool _isOnline = true;
  SyncStatus _syncStatus = SyncStatus.idle;
  SyncResult? _lastResult;
  String? _error;

  StreamSubscription? _connectivitySub;
  StreamSubscription? _syncStatusSub;
  StreamSubscription? _syncResultSub;

  OfflineQueueProvider({
    required OfflineQueueService queueService,
    required ConnectivityService connectivityService,
    required SyncService syncService,
  })  : _queueService = queueService,
        _connectivityService = connectivityService,
        _syncService = syncService {
    _isOnline = _connectivityService.isOnline;

    _connectivitySub =
        _connectivityService.onConnectivityChanged.listen((online) {
      _isOnline = online;
      notifyListeners();
    });

    _syncStatusSub = _syncService.statusStream.listen((status) {
      _syncStatus = status;
      _refreshPendingCount();
      notifyListeners();
    });

    _syncResultSub = _syncService.resultStream.listen((result) {
      _lastResult = result;
      _refreshItems();
      notifyListeners();
    });

    _refreshPendingCount();
  }

  List<QueuedItem> get items => _items;
  int get pendingCount => _pendingCount;
  bool get isOnline => _isOnline;
  SyncStatus get syncStatus => _syncStatus;
  SyncResult? get lastResult => _lastResult;
  String? get error => _error;
  bool get hasPendingItems => _pendingCount > 0;
  bool get isSyncing => _syncStatus == SyncStatus.syncing;

  // ─── ENQUEUE ACTIONS ──────────────────────────────────────────

  Future<QueuedItem> enqueueCreateJob({
    required String scheduledDate,
    required String scheduledTime,
    required String locationAddress,
    double? locationLat,
    double? locationLng,
    String? notes,
  }) async {
    final item = await _queueService.enqueue(
      action: QueueAction.CREATE_JOB,
      data: {
        'scheduledDate': scheduledDate,
        'scheduledTime': scheduledTime,
        'locationAddress': locationAddress,
        if (locationLat != null) 'locationLat': locationLat,
        if (locationLng != null) 'locationLng': locationLng,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      },
    );
    await _refreshPendingCount();
    notifyListeners();
    return item;
  }

  Future<QueuedItem> enqueueCompleteJob({
    required String jobId,
    required String proofImageUrl,
    double? collectorLat,
    double? collectorLng,
  }) async {
    final item = await _queueService.enqueue(
      action: QueueAction.COMPLETE_JOB,
      jobId: jobId,
      data: {
        'proofImageUrl': proofImageUrl,
        if (collectorLat != null) 'collectorLat': collectorLat,
        if (collectorLng != null) 'collectorLng': collectorLng,
      },
    );
    await _refreshPendingCount();
    notifyListeners();
    return item;
  }

  Future<QueuedItem> enqueueRateJob({
    required String jobId,
    required int value,
    String? comment,
  }) async {
    final item = await _queueService.enqueue(
      action: QueueAction.RATE_JOB,
      jobId: jobId,
      data: {
        'value': value,
        if (comment != null && comment.isNotEmpty) 'comment': comment,
      },
    );
    await _refreshPendingCount();
    notifyListeners();
    return item;
  }

  // ─── SYNC CONTROLS ───────────────────────────────────────────

  Future<void> triggerSync() async {
    _error = null;
    notifyListeners();
    await _syncService.syncPendingItems();
  }

  Future<void> retrySync() async {
    _error = null;
    notifyListeners();
    await _syncService.retryNow();
  }

  // ─── DATA ACCESS ─────────────────────────────────────────────

  Future<void> refreshItems() async {
    await _refreshItems();
    notifyListeners();
  }

  Future<void> _refreshItems() async {
    if (!_queueService.isSupported) return;
    try {
      _items = await _queueService.getAllItems();
      _pendingCount = await _queueService.getPendingCount();
    } catch (e) {
      debugPrint('[QueueProvider] Error refreshing items: $e');
    }
  }

  Future<void> _refreshPendingCount() async {
    if (!_queueService.isSupported) return;
    try {
      _pendingCount = await _queueService.getPendingCount();
    } catch (e) {
      debugPrint('[QueueProvider] Error refreshing count: $e');
    }
  }

  Future<void> clearSynced() async {
    await _queueService.clearSynced();
    await _refreshItems();
    notifyListeners();
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    _syncStatusSub?.cancel();
    _syncResultSub?.cancel();
    super.dispose();
  }
}
