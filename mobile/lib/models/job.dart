import 'proof.dart';

enum JobStatus {
  requested,
  assigned,
  inProgress,
  completed,
  validated,
  rated,
  cancelled,
  disputed;

  static JobStatus fromString(String value) {
    final lowerValue = value.toLowerCase();
    // Handle camelCase conversion from snake_case or uppercase if needed
    if (lowerValue == 'in_progress') return JobStatus.inProgress;
    
    return JobStatus.values.firstWhere(
      (e) => e.name.toLowerCase() == lowerValue,
      orElse: () => JobStatus.requested,
    );
  }

  String toBackendString() => name.toUpperCase();
}

class Job {
  final String id;
  final String householdId;
  final String? householdName;
  final String? collectorId;
  final String? collectorName;
  final JobStatus status;
  final String scheduledDate;
  final String scheduledTime;
  final String locationAddress;
  final double? locationLat;
  final double? locationLng;
  final String? notes;
  final DateTime? assignedAt;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final DateTime? validatedAt;
  final DateTime? cancelledAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final int? rating;
  final String? ratingComment;
  final Proof? proof;

  Job({
    required this.id,
    required this.householdId,
    this.householdName,
    this.collectorId,
    this.collectorName,
    required this.status,
    required this.scheduledDate,
    required this.scheduledTime,
    required this.locationAddress,
    this.locationLat,
    this.locationLng,
    this.notes,
    this.assignedAt,
    this.startedAt,
    this.completedAt,
    this.validatedAt,
    this.cancelledAt,
    required this.createdAt,
    required this.updatedAt,
    this.rating,
    this.ratingComment,
    this.proof,
  });

  factory Job.fromJson(Map<String, dynamic> json) {
    try {
      return Job(
        id: json['id'] as String,
        householdId: json['householdId'] as String,
        householdName: json['householdName'] as String?,
        collectorId: json['collectorId'] as String?,
        collectorName: json['collectorName'] as String?,
        status: JobStatus.fromString(json['status'] as String),
        scheduledDate: json['scheduledDate'] as String,
        scheduledTime: json['scheduledTime'] as String,
        locationAddress: json['locationAddress'] as String,
        locationLat: (json['locationLat'] as num?)?.toDouble(),
        locationLng: (json['locationLng'] as num?)?.toDouble(),
        notes: json['notes'] as String?,
        assignedAt: json['assignedAt'] != null
            ? DateTime.parse(json['assignedAt'] as String)
            : null,
        startedAt: json['startedAt'] != null
            ? DateTime.parse(json['startedAt'] as String)
            : null,
        completedAt: json['completedAt'] != null
            ? DateTime.parse(json['completedAt'] as String)
            : null,
        validatedAt: json['validatedAt'] != null
            ? DateTime.parse(json['validatedAt'] as String)
            : null,
        cancelledAt: json['cancelledAt'] != null
            ? DateTime.parse(json['cancelledAt'] as String)
            : null,
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
        rating: json['rating'] as int?,
        ratingComment: json['ratingComment'] as String?,
        proof: json['proof'] != null ? Proof.fromJson(json['proof'] as Map<String, dynamic>) : null,
      );
    } catch (e) {
      print('Job.fromJson error: $e');
      print('JSON data: $json');
      rethrow;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'householdId': householdId,
      'status': status.toBackendString(),
      'scheduledDate': scheduledDate,
      'scheduledTime': scheduledTime,
      'locationAddress': locationAddress,
      'locationLat': locationLat,
      'locationLng': locationLng,
      'notes': notes,
      'rating': rating,
      'ratingComment': ratingComment,
      'proof': proof?.toJson(),
    };
  }

  Job copyWith({
    JobStatus? status,
    String? collectorId,
    String? collectorName,
    DateTime? assignedAt,
    DateTime? startedAt,
    DateTime? completedAt,
    DateTime? validatedAt,
    DateTime? cancelledAt,
    DateTime? updatedAt,
    int? rating,
    String? ratingComment,
    Proof? proof,
  }) {
    return Job(
      id: id,
      householdId: householdId,
      householdName: householdName,
      collectorId: collectorId ?? this.collectorId,
      collectorName: collectorName ?? this.collectorName,
      status: status ?? this.status,
      scheduledDate: scheduledDate,
      scheduledTime: scheduledTime,
      locationAddress: locationAddress,
      locationLat: locationLat,
      locationLng: locationLng,
      notes: notes,
      assignedAt: assignedAt ?? this.assignedAt,
      startedAt: startedAt ?? this.startedAt,
      completedAt: completedAt ?? this.completedAt,
      validatedAt: validatedAt ?? this.validatedAt,
      cancelledAt: cancelledAt ?? this.cancelledAt,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      rating: rating ?? this.rating,
      ratingComment: ratingComment ?? this.ratingComment,
      proof: proof ?? this.proof,
    );
  }

  bool get isActive =>
      status == JobStatus.requested ||
      status == JobStatus.assigned ||
      status == JobStatus.inProgress;

  bool get canCancel =>
      status == JobStatus.requested || status == JobStatus.assigned;

  bool get canValidate => status == JobStatus.completed;

  bool get canRate => status == JobStatus.validated;

  bool get isTerminal =>
      status == JobStatus.rated || status == JobStatus.cancelled;
}

class PaginatedJobs {
  final List<Job> data;
  final int page;
  final int limit;
  final int total;
  final int pages;

  PaginatedJobs({
    required this.data,
    required this.page,
    required this.limit,
    required this.total,
    required this.pages,
  });

  factory PaginatedJobs.fromJson(Map<String, dynamic> json) {
    try {
      print('PaginatedJobs.fromJson: JSON = $json');
      final meta = json['meta'] as Map<String, dynamic>;
      print('PaginatedJobs.fromJson: meta = $meta');
      return PaginatedJobs(
        data: (json['data'] as List)
            .map((e) => Job.fromJson(e as Map<String, dynamic>))
            .toList(),
        page: meta['page'] as int,
        limit: meta['limit'] as int,
        total: meta['total'] as int,
        pages: meta['totalPages'] as int,
      );
    } catch (e) {
      print('PaginatedJobs.fromJson error: $e');
      print('JSON data: $json');
      rethrow;
    }
  }
}
