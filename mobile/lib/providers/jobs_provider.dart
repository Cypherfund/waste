import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/job.dart';
import '../services/api/api_client.dart';
import '../services/api/jobs_api.dart';
import '../services/websocket/websocket_service.dart';

class JobsProvider extends ChangeNotifier {
  final JobsApi _jobsApi;
  final WebSocketService _wsService;

  List<Job> _jobs = [];
  bool _isLoading = false;
  String? _error;
  int _currentPage = 1;
  int _totalPages = 1;
  JobStatus? _filterStatus;
  StreamSubscription<JobStatusUpdate>? _wsSub;

  JobsProvider({
    required JobsApi jobsApi,
    required WebSocketService wsService,
  })  : _jobsApi = jobsApi,
        _wsService = wsService {
    _wsSub = _wsService.jobStatusStream.listen(_handleJobStatusUpdate);
  }

  List<Job> get jobs => _jobs;
  bool get isLoading => _isLoading;
  String? get error => _error;
  int get currentPage => _currentPage;
  int get totalPages => _totalPages;
  JobStatus? get filterStatus => _filterStatus;

  List<Job> get activeJobs =>
      _jobs.where((j) => j.isActive).toList();

  List<Job> get completedJobs => _jobs
      .where((j) =>
          j.status == JobStatus.COMPLETED ||
          j.status == JobStatus.VALIDATED ||
          j.status == JobStatus.RATED)
      .toList();

  Future<void> loadJobs({bool refresh = false}) async {
    if (refresh) _currentPage = 1;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _jobsApi.getMyJobs(
        status: _filterStatus,
        page: _currentPage,
      );
      if (refresh || _currentPage == 1) {
        _jobs = result.data;
      } else {
        _jobs = [..._jobs, ...result.data];
      }
      _totalPages = result.pages;
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadMore() async {
    if (_currentPage >= _totalPages || _isLoading) return;
    _currentPage++;
    await loadJobs();
  }

  void setFilter(JobStatus? status) {
    _filterStatus = status;
    loadJobs(refresh: true);
  }

  Future<Job?> createJob({
    required String scheduledDate,
    required String scheduledTime,
    required String locationAddress,
    double? locationLat,
    double? locationLng,
    String? notes,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final job = await _jobsApi.createJob(
        scheduledDate: scheduledDate,
        scheduledTime: scheduledTime,
        locationAddress: locationAddress,
        locationLat: locationLat,
        locationLng: locationLng,
        notes: notes,
      );
      _jobs.insert(0, job);
      _wsService.subscribeToJob(job.id);
      notifyListeners();
      return job;
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
      notifyListeners();
      return null;
    } finally {
      _isLoading = false;
    }
  }

  Future<bool> validateJob(String jobId) async {
    try {
      final updated = await _jobsApi.validateJob(jobId);
      _updateJobInList(updated);
      return true;
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
      notifyListeners();
      return false;
    }
  }

  Future<bool> cancelJob(String jobId, {String? reason}) async {
    try {
      final updated = await _jobsApi.cancelJob(jobId, reason: reason);
      _updateJobInList(updated);
      return true;
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
      notifyListeners();
      return false;
    }
  }

  Future<bool> rateJob(String jobId, {required int value, String? comment}) async {
    try {
      await _jobsApi.rateJob(jobId, value: value, comment: comment);
      // Refresh job to get updated status (VALIDATED → RATED)
      final updatedJob = await _jobsApi.getJob(jobId);
      _updateJobInList(updatedJob);
      return true;
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
      notifyListeners();
      return false;
    }
  }

  void _handleJobStatusUpdate(JobStatusUpdate update) {
    final index = _jobs.indexWhere((j) => j.id == update.jobId);
    if (index != -1) {
      _jobs[index] = _jobs[index].copyWith(
        status: update.status,
        collectorId: update.collectorId,
      );
      notifyListeners();
    }
  }

  void _updateJobInList(Job updatedJob) {
    final index = _jobs.indexWhere((j) => j.id == updatedJob.id);
    if (index != -1) {
      _jobs[index] = updatedJob;
    }
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _wsSub?.cancel();
    super.dispose();
  }
}
