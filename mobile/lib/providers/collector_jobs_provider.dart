import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/job.dart';
import '../services/api/api_client.dart';
import '../services/api/job_api.dart';
import '../services/api/files_api.dart';
import '../services/websocket/websocket_service.dart';
import '../services/location/location_tracking_service.dart';
import 'dart:io';

class CollectorJobsProvider extends ChangeNotifier {
  final JobApi _jobApi;
  final FilesApi _filesApi;
  final WebSocketService _wsService;
  final LocationTrackingService _locationService;

  List<Job> _jobs = [];
  bool _isLoading = false;
  String? _error;
  bool _isActioning = false;
  StreamSubscription? _statusSub;
  StreamSubscription? _assignedSub;

  CollectorJobsProvider({
    required JobApi jobApi,
    required FilesApi filesApi,
    required WebSocketService wsService,
    required LocationTrackingService locationService,
  })  : _jobApi = jobApi,
        _filesApi = filesApi,
        _wsService = wsService,
        _locationService = locationService {
    _statusSub = _wsService.jobStatusStream.listen(_onJobStatusUpdate);
    _assignedSub =
        _wsService.collectorAssignedStream.listen(_onCollectorAssigned);
  }

  List<Job> get jobs => _jobs;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isActioning => _isActioning;

  List<Job> get assignedJobs =>
      _jobs.where((j) => j.status == JobStatus.assigned).toList();

  List<Job> get inProgressJobs =>
      _jobs.where((j) => j.status == JobStatus.inProgress).toList();

  List<Job> get completedJobs => _jobs
      .where((j) =>
          j.status == JobStatus.completed ||
          j.status == JobStatus.validated ||
          j.status == JobStatus.rated)
      .toList();

  List<Job> get activeJobs => _jobs
      .where(
          (j) => j.status == JobStatus.assigned || j.status == JobStatus.inProgress)
      .toList();

  Job? getJobById(String id) {
    try {
      return _jobs.firstWhere((j) => j.id == id);
    } catch (_) {
      return null;
    }
  }

  // ─── LOAD JOBS ──────────────────────────────────────────────

  Future<void> loadJobs({bool refresh = false}) async {
    if (_isLoading && !refresh) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _jobApi.getAssignedJobs();
      _jobs = result.data;
      for (final job in _jobs) {
        _wsService.subscribeToJob(job.id);
      }
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ─── ACCEPT JOB ────────────────────────────────────────────

  Future<bool> acceptJob(String jobId) async {
    _isActioning = true;
    _error = null;
    notifyListeners();

    try {
      final updated = await _jobApi.acceptJob(jobId);
      _updateJobInList(updated);
      return true;
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
      return false;
    } finally {
      _isActioning = false;
      notifyListeners();
    }
  }

  // ─── REJECT JOB ────────────────────────────────────────────

  Future<bool> rejectJob(String jobId, {String? reason}) async {
    _isActioning = true;
    _error = null;
    notifyListeners();

    try {
      await _jobApi.rejectJob(jobId, reason: reason);
      _jobs.removeWhere((j) => j.id == jobId);
      _wsService.unsubscribeFromJob(jobId);
      return true;
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
      return false;
    } finally {
      _isActioning = false;
      notifyListeners();
    }
  }

  // ─── START JOB ─────────────────────────────────────────────

  Future<bool> startJob(String jobId) async {
    _isActioning = true;
    _error = null;
    notifyListeners();

    try {
      final updated = await _jobApi.startJob(jobId);
      _updateJobInList(updated);
      await _locationService.startTracking(jobId);
      return true;
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
      return false;
    } finally {
      _isActioning = false;
      notifyListeners();
    }
  }

  // ─── COMPLETE JOB ──────────────────────────────────────────

  Future<bool> completeJob(String jobId, {required File proofImage}) async {
    _isActioning = true;
    _error = null;
    notifyListeners();

    try {
      // Upload proof image
      final uploadResult = await _filesApi.uploadProofImage(proofImage);

      // Complete with proof URL and optional location
      double? lat;
      double? lng;
      try {
        final pos = await _getLastKnownPosition();
        lat = pos?.$1;
        lng = pos?.$2;
      } catch (_) {}

      final updated = await _jobApi.completeJob(
        jobId,
        proofImageUrl: uploadResult.fileUrl,
        collectorLat: lat,
        collectorLng: lng,
      );

      _locationService.stopTracking();
      _updateJobInList(updated);
      return true;
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
      return false;
    } finally {
      _isActioning = false;
      notifyListeners();
    }
  }

  Future<(double, double)?> _getLastKnownPosition() async {
    try {
      final pos = await Future.any([
        Future.delayed(const Duration(seconds: 3), () => null),
      ]);
      return pos != null ? (0.0, 0.0) : null;
    } catch (_) {
      return null;
    }
  }

  // ─── REFRESH SINGLE JOB ───────────────────────────────────

  Future<Job?> refreshJob(String jobId) async {
    try {
      final job = await _jobApi.getJob(jobId);
      _updateJobInList(job);
      return job;
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
      notifyListeners();
      return null;
    }
  }

  // ─── WEBSOCKET HANDLERS ───────────────────────────────────

  void _onJobStatusUpdate(JobStatusUpdate update) {
    final idx = _jobs.indexWhere((j) => j.id == update.jobId);
    if (idx != -1) {
      _jobs[idx] = _jobs[idx].copyWith(status: update.status);

      // Stop location tracking if job is no longer inProgress
      if (update.status != JobStatus.inProgress &&
          _locationService.activeJobId == update.jobId) {
        _locationService.stopTracking();
      }

      notifyListeners();
    }
  }

  void _onCollectorAssigned(CollectorAssignedEvent event) {
    debugPrint('[CollectorJobs] WS collector:assigned received — jobId=${event.jobId}');
    loadJobs(refresh: true);
  }

  // ─── HELPERS ──────────────────────────────────────────────

  void _updateJobInList(Job updated) {
    final idx = _jobs.indexWhere((j) => j.id == updated.id);
    if (idx != -1) {
      _jobs[idx] = updated;
    } else {
      _jobs.insert(0, updated);
      _wsService.subscribeToJob(updated.id);
    }
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _statusSub?.cancel();
    _assignedSub?.cancel();
    _locationService.dispose();
    super.dispose();
  }
}
