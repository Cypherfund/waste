enum JobStatus {
  REQUESTED,
  ASSIGNED,
  IN_PROGRESS,
  COMPLETED,
  VALIDATED,
  RATED,
  CANCELLED,
  DISPUTED;

  static JobStatus fromString(String value) {
    return JobStatus.values.firstWhere(
      (e) => e.name == value,
      orElse: () => JobStatus.REQUESTED,
    );
  }
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
  });

  factory Job.fromJson(Map<String, dynamic> json) {
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
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'householdId': householdId,
      'status': status.name,
      'scheduledDate': scheduledDate,
      'scheduledTime': scheduledTime,
      'locationAddress': locationAddress,
      'locationLat': locationLat,
      'locationLng': locationLng,
      'notes': notes,
    };
  }

  Job copyWith({JobStatus? status, String? collectorId, String? collectorName}) {
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
      assignedAt: assignedAt,
      startedAt: startedAt,
      completedAt: completedAt,
      validatedAt: validatedAt,
      cancelledAt: cancelledAt,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }

  bool get isActive =>
      status == JobStatus.REQUESTED ||
      status == JobStatus.ASSIGNED ||
      status == JobStatus.IN_PROGRESS;

  bool get canCancel =>
      status == JobStatus.REQUESTED || status == JobStatus.ASSIGNED;

  bool get canValidate => status == JobStatus.COMPLETED;

  bool get canRate => status == JobStatus.VALIDATED;

  bool get isTerminal =>
      status == JobStatus.RATED || status == JobStatus.CANCELLED;
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
    final meta = json['meta'] as Map<String, dynamic>;
    return PaginatedJobs(
      data: (json['data'] as List)
          .map((e) => Job.fromJson(e as Map<String, dynamic>))
          .toList(),
      page: meta['page'] as int,
      limit: meta['limit'] as int,
      total: meta['total'] as int,
      pages: meta['pages'] as int,
    );
  }
}
