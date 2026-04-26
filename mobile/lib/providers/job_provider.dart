import 'package:flutter/foundation.dart';
import '../models/job.dart';
import '../services/api/api_client.dart';
import '../services/api/job_api.dart';
import '../services/offline/sync_service.dart';
import '../services/websocket/websocket_service.dart';
import 'dart:async';

class JobProvider extends ChangeNotifier {
  final JobApi _jobApi;
  final SyncService _syncService;
  final WebSocketService _wsService;
  StreamSubscription? _statusSub;
  
  List<Job> _jobs = [];
  bool _isLoading = false;
  String? _error;
  int _currentPage = 1;
  int _totalPages = 1;
  JobStatus? _filterStatus;
  
  JobProvider({
    required JobApi jobApi,
    required SyncService syncService,
    required WebSocketService wsService,
  })  : _jobApi = jobApi,
        _syncService = syncService,
        _wsService = wsService {
    _initWebSocket();
  }

  void _initWebSocket() {
    _statusSub = _wsService.jobStatusStream.listen((update) {
      final index = _jobs.indexWhere((j) => j.id == update.jobId);
      if (index != -1) {
        final currentJob = _jobs[index];
        final updatedJob = currentJob.copyWith(
          status: update.status,
          collectorId: update.collectorId,
          updatedAt: update.updatedAt,
        );
        _jobs[index] = updatedJob;
        _syncService.updateJob(updatedJob);
        notifyListeners();
      }
    });
  }

  // Getters
  List<Job> get jobs => _jobs;
  bool get isLoading => _isLoading;
  String? get error => _error;
  int get currentPage => _currentPage;
  int get totalPages => _totalPages;
  JobStatus? get filterStatus => _filterStatus;
  
  List<Job> get upcomingJobs => _jobs
      .where((job) => [
            JobStatus.requested,
            JobStatus.assigned,
            JobStatus.inProgress,
          ].contains(job.status))
      .toList()
    ..sort((a, b) => a.scheduledDate.compareTo(b.scheduledDate));
      
  List<Job> get completedJobs => _jobs
      .where((job) => [
            JobStatus.completed,
            JobStatus.validated,
            JobStatus.rated,
          ].contains(job.status))
      .toList()
    ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
      
  List<Job> get activeJobs => _jobs
      .where((job) => [
            JobStatus.requested,
            JobStatus.assigned,
            JobStatus.inProgress,
          ].contains(job.status))
      .toList();

  // Load user's jobs
  Future<void> loadMyJobs({bool refresh = false}) => loadJobs(refresh: refresh);

  // Load jobs from local storage only (for immediate display)
  Future<void> loadJobsFromLocal() async {
    try {
      print('JobProvider: Loading jobs from local storage...');
      final localJobs = await _syncService.getLocalJobs();
      print('JobProvider: Local storage returned ${localJobs.length} jobs');
      if (localJobs.isNotEmpty) {
        _jobs = localJobs;
        _error = null;
        notifyListeners();
      }
    } catch (e) {
      print('JobProvider: Local storage failed with error: $e');
      // Silent failure - will try API next
    }
  }

  Future<void> loadJobs({bool refresh = false}) async {
    if (refresh) _currentPage = 1;
    if (_isLoading && !refresh) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      print('JobProvider: Loading jobs from API...');
      // Try to load from API first
      final result = await _jobApi.getMyJobs(
        status: _filterStatus,
        page: _currentPage,
      );

      print('JobProvider: API returned ${result.data.length} jobs');
      if (refresh || _currentPage == 1) {
        _jobs = result.data;
      } else {
        _jobs = [..._jobs, ...result.data];
      }

      _totalPages = result.pages;
      _error = null;

      // Sync to local database for offline access
      await _syncService.syncJobs(_jobs);

      // Subscribe to all jobs for real-time updates
      for (final job in _jobs) {
        _wsService.subscribeToJob(job.id);
      }
    } catch (e) {
      print('JobProvider: API failed with error: $e');
      // If API fails, try loading from local database
      try {
        final localJobs = await _syncService.getLocalJobs();
        print('JobProvider: Local storage returned ${localJobs.length} jobs');
        if (localJobs.isNotEmpty) {
          _jobs = localJobs;
          _error = 'Offline: Loading from local storage.';
        } else {
          _error = 'Failed to load jobs. Please check your connection.';
        }
      } catch (localError) {
        print('JobProvider: Local storage failed with error: $localError');
        _error = 'Failed to load jobs. Please check your connection.';
        _jobs = [];
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Create a new job
  Future<Job?> createJob({
    required DateTime scheduledDate,
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
      final job = await _jobApi.createJob(
        scheduledDate: scheduledDate.toIso8601String().split('T')[0],
        scheduledTime: scheduledTime,
        locationAddress: locationAddress,
        locationLat: locationLat,
        locationLng: locationLng,
        notes: notes,
      );
      
      // Add to local list
      _jobs.insert(0, job);
      
      // Sync to local database
      await _syncService.addJob(job);
      
      // Subscribe to job updates
      _wsService.subscribeToJob(job.id);
      
      _error = null;
      notifyListeners();
      return job;
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
      notifyListeners();
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Cancel a job
  Future<bool> cancelJob(String jobId, {String? reason}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final job = await _jobApi.cancelJob(jobId, reason: reason);
      
      // Update local list
      final index = _jobs.indexWhere((j) => j.id == jobId);
      if (index != -1) {
        _jobs[index] = job;
      }
      
      // Sync to local database
      await _syncService.updateJob(job);
      
      _error = null;
      notifyListeners();
      return true;
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Get a specific job
  Job? getJob(String jobId) {
    try {
      return _jobs.firstWhere((job) => job.id == jobId);
    } catch (e) {
      return null;
    }
  }

  // Refresh a specific job
  Future<void> refreshJob(String jobId) async {
    try {
      final updatedJob = await _jobApi.getJob(jobId);
      final index = _jobs.indexWhere((job) => job.id == jobId);
      
      if (index != -1) {
        _jobs[index] = updatedJob;
        await _syncService.updateJob(updatedJob);
        notifyListeners();
      }
    } catch (e) {
      // Silent failure
    }
  }

  // Rate a job
  Future<bool> rateJob(String jobId, int rating, {String? comment}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _jobApi.rateJob(jobId, rating: rating, comment: comment);
      
      // Since rating update doesn't return the Job, we refresh it
      await refreshJob(jobId);
      
      _error = null;
      notifyListeners();
      return true;
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Validate proof
  Future<bool> validateProof(String jobId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final job = await _jobApi.validateProof(jobId);
      
      // Update local list
      final index = _jobs.indexWhere((j) => j.id == jobId);
      if (index != -1) {
        _jobs[index] = job;
      }
      
      // Sync to local database
      await _syncService.updateJob(job);
      
      _error = null;
      notifyListeners();
      return true;
    } catch (e) {
      _error = 'Failed to validate proof. Please try again.';
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Dispute proof
  Future<bool> disputeProof(String jobId, String reason) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final job = await _jobApi.disputeProof(jobId, reason: reason);
      
      // Update local list
      final index = _jobs.indexWhere((j) => j.id == jobId);
      if (index != -1) {
        _jobs[index] = job;
      }
      
      // Sync to local database
      await _syncService.updateJob(job);
      
      _error = null;
      notifyListeners();
      return true;
    } catch (e) {
      _error = 'Failed to submit dispute. Please try again.';
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  // Clear error
  void clearError() {
    _error = null;
    notifyListeners();
  }

  // Clear all data
  void clear() {
    _jobs = [];
    _error = null;
    _isLoading = false;
    notifyListeners();
  }
  @override
  void dispose() {
    _statusSub?.cancel();
    super.dispose();
  }
}
