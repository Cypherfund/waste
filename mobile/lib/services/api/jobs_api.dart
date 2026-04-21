import '../../models/job.dart';
import '../../models/rating.dart';
import 'api_client.dart';

class JobsApi {
  final ApiClient _client;

  JobsApi(this._client);

  Future<Job> createJob({
    required String scheduledDate,
    required String scheduledTime,
    required String locationAddress,
    double? locationLat,
    double? locationLng,
    String? notes,
  }) async {
    final response = await _client.dio.post('/jobs', data: {
      'scheduledDate': scheduledDate,
      'scheduledTime': scheduledTime,
      'locationAddress': locationAddress,
      if (locationLat != null) 'locationLat': locationLat,
      if (locationLng != null) 'locationLng': locationLng,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
    });
    return Job.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PaginatedJobs> getMyJobs({
    JobStatus? status,
    int page = 1,
    int limit = 20,
  }) async {
    final params = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (status != null) {
      params['status'] = status.name;
    }
    final response = await _client.dio.get('/jobs/mine', queryParameters: params);
    return PaginatedJobs.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Job> getJob(String id) async {
    final response = await _client.dio.get('/jobs/$id');
    return Job.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Job> validateJob(String id) async {
    final response = await _client.dio.post('/jobs/$id/validate');
    return Job.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Job> cancelJob(String id, {String? reason}) async {
    final response = await _client.dio.post('/jobs/$id/cancel', data: {
      if (reason != null && reason.isNotEmpty) 'reason': reason,
    });
    return Job.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Rating> rateJob(String id, {required int value, String? comment}) async {
    final response = await _client.dio.post('/jobs/$id/rate', data: {
      'value': value,
      if (comment != null && comment.isNotEmpty) 'comment': comment,
    });
    return Rating.fromJson(response.data as Map<String, dynamic>);
  }

  // ─── COLLECTOR ENDPOINTS ──────────────────────────────────────

  Future<PaginatedJobs> getAssignedJobs({
    JobStatus? status,
    int page = 1,
    int limit = 20,
  }) async {
    final params = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (status != null) {
      params['status'] = status.name;
    }
    final response =
        await _client.dio.get('/jobs/assigned', queryParameters: params);
    return PaginatedJobs.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Job> acceptJob(String id) async {
    final response = await _client.dio.post('/jobs/$id/accept');
    return Job.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> rejectJob(String id, {String? reason}) async {
    final response = await _client.dio.post('/jobs/$id/reject', data: {
      if (reason != null && reason.isNotEmpty) 'reason': reason,
    });
    return response.data as Map<String, dynamic>;
  }

  Future<Job> startJob(String id) async {
    final response = await _client.dio.post('/jobs/$id/start');
    return Job.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Job> completeJob(
    String id, {
    required String proofImageUrl,
    double? collectorLat,
    double? collectorLng,
  }) async {
    final response = await _client.dio.post('/jobs/$id/complete', data: {
      'proofImageUrl': proofImageUrl,
      if (collectorLat != null) 'collectorLat': collectorLat,
      if (collectorLng != null) 'collectorLng': collectorLng,
    });
    return Job.fromJson(response.data as Map<String, dynamic>);
  }
}
