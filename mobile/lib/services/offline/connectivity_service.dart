import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

class ConnectivityService {
  final Connectivity _connectivity;
  StreamSubscription? _subscription;
  final _statusController = StreamController<bool>.broadcast();
  bool _isOnline = true;

  ConnectivityService({Connectivity? connectivity})
      : _connectivity = connectivity ?? Connectivity();

  bool get isOnline => _isOnline;
  Stream<bool> get onConnectivityChanged => _statusController.stream;

  Future<void> initialize() async {
    final result = await _connectivity.checkConnectivity();
    _isOnline = _hasConnection(result);
    debugPrint('[Connectivity] Initial status: ${_isOnline ? "online" : "offline"}');

    _subscription = _connectivity.onConnectivityChanged.listen((result) {
      final wasOnline = _isOnline;
      _isOnline = _hasConnection(result);

      if (wasOnline != _isOnline) {
        debugPrint('[Connectivity] Status changed: ${_isOnline ? "online" : "offline"}');
        _statusController.add(_isOnline);
      }
    });
  }

  bool _hasConnection(List<ConnectivityResult> result) {
    return result.any((r) => 
      r == ConnectivityResult.wifi ||
      r == ConnectivityResult.mobile ||
      r == ConnectivityResult.ethernet
    );
  }

  void dispose() {
    _subscription?.cancel();
    _statusController.close();
  }
}
