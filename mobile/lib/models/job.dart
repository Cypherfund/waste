import 'proof.dart';

enum JobStatus {
  paymentPending,
  paymentFailed,
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
    if (lowerValue == 'in_progress') return JobStatus.inProgress;
    if (lowerValue == 'payment_pending') return JobStatus.paymentPending;
    if (lowerValue == 'payment_failed') return JobStatus.paymentFailed;

    return JobStatus.values.firstWhere(
      (e) => e.name.toLowerCase() == lowerValue,
      orElse: () => JobStatus.requested,
    );
  }

  String toBackendString() {
    if (this == JobStatus.paymentPending) return 'PAYMENT_PENDING';
    if (this == JobStatus.paymentFailed) return 'PAYMENT_FAILED';
    if (this == JobStatus.inProgress) return 'IN_PROGRESS';
    return name.toUpperCase();
  }
}

class Job {
  final String id;
  final String householdId;
  final String? householdName;
  final String? householdPhone;
  final String? collectorId;
  final String? collectorName;
  final String? collectorPhone;
  final double? collectorRating;
  final String? collectorAvatarUrl;
  final JobStatus status;
  final String scheduledDate;
  final String scheduledTime;
  final String locationAddress;
  final double? locationLat;
  final double? locationLng;
  final String? notes;
  final String? paymentMode;
  final String? paymentMethod;
  final String? paymentRef;
  final String? paymentProofUrl;
  final String? paymentStatus;
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
  final double? quotedPrice;
  final String? pricingType;
  final bool? isCoveredBySubscription;

  Job({
    required this.id,
    required this.householdId,
    this.householdName,
    this.householdPhone,
    this.collectorId,
    this.collectorName,
    this.collectorPhone,
    this.collectorRating,
    this.collectorAvatarUrl,
    required this.status,
    required this.scheduledDate,
    required this.scheduledTime,
    required this.locationAddress,
    this.locationLat,
    this.locationLng,
    this.notes,
    this.paymentMode,
    this.paymentMethod,
    this.paymentRef,
    this.paymentProofUrl,
    this.paymentStatus,
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
    this.quotedPrice,
    this.pricingType,
    this.isCoveredBySubscription,
  });

  factory Job.fromJson(Map<String, dynamic> json) {
    return Job(
      id: json['id'] as String,
      householdId: json['householdId'] as String,
      householdName: json['householdName'] as String?,
      householdPhone: json['householdPhone'] as String?,
      collectorId: json['collectorId'] as String?,
      collectorName: json['collectorName'] as String?,
      collectorPhone: json['collectorPhone'] as String?,
      collectorRating: json['collectorRating'] != null ? double.tryParse(json['collectorRating'].toString()) : null,
      collectorAvatarUrl: json['collectorAvatarUrl'] as String?,
      status: JobStatus.fromString(json['status'] as String),
      scheduledDate: json['scheduledDate'] as String,
      scheduledTime: json['scheduledTime'] as String,
      locationAddress: json['locationAddress'] as String,
      locationLat: json['locationLat'] != null
          ? double.tryParse(json['locationLat'].toString())
          : null,
      locationLng: json['locationLng'] != null
          ? double.tryParse(json['locationLng'].toString())
          : null,
      notes: json['notes'] as String?,
      paymentMode: json['paymentMode'] as String?,
      paymentMethod: json['paymentMethod'] as String?,
      paymentRef: json['paymentRef'] as String?,
      paymentProofUrl: json['paymentProofUrl'] as String?,
      paymentStatus: json['paymentStatus'] as String?,
      assignedAt: json['assignedAt'] != null
          ? DateTime.tryParse(json['assignedAt'] as String)
          : null,
      startedAt: json['startedAt'] != null
          ? DateTime.tryParse(json['startedAt'] as String)
          : null,
      completedAt: json['completedAt'] != null
          ? DateTime.tryParse(json['completedAt'] as String)
          : null,
      validatedAt: json['validatedAt'] != null
          ? DateTime.tryParse(json['validatedAt'] as String)
          : null,
      cancelledAt: json['cancelledAt'] != null
          ? DateTime.tryParse(json['cancelledAt'] as String)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      rating: json['rating'] as int?,
      ratingComment: json['ratingComment'] as String?,
      proof: json['proof'] != null ? Proof.fromJson(json['proof'] as Map<String, dynamic>) : null,
      quotedPrice: json['quotedPrice'] != null ? double.tryParse(json['quotedPrice'].toString()) : null,
      pricingType: json['pricingType'] as String?,
      isCoveredBySubscription: json['isCoveredBySubscription'] as bool?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'householdId': householdId,
      'householdName': householdName,
      'householdPhone': householdPhone,
      'collectorId': collectorId,
      'collectorName': collectorName,
      'collectorPhone': collectorPhone,
      'collectorRating': collectorRating,
      'collectorAvatarUrl': collectorAvatarUrl,
      'status': status.toBackendString(),
      'scheduledDate': scheduledDate,
      'scheduledTime': scheduledTime,
      'locationAddress': locationAddress,
      'locationLat': locationLat,
      'locationLng': locationLng,
      'notes': notes,
      'assignedAt': assignedAt?.toIso8601String(),
      'startedAt': startedAt?.toIso8601String(),
      'completedAt': completedAt?.toIso8601String(),
      'validatedAt': validatedAt?.toIso8601String(),
      'cancelledAt': cancelledAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'rating': rating,
      'ratingComment': ratingComment,
      'proof': proof?.toJson(),
      'quotedPrice': quotedPrice,
      'pricingType': pricingType,
      'isCoveredBySubscription': isCoveredBySubscription,
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
      householdPhone: householdPhone,
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
    final meta = json['meta'] as Map<String, dynamic>;
    return PaginatedJobs(
      data: (json['data'] as List)
          .map((e) => Job.fromJson(e as Map<String, dynamic>))
          .toList(),
      page: meta['page'] as int,
      limit: meta['limit'] as int,
      total: meta['total'] as int,
      pages: meta['totalPages'] as int,
    );
  }
}
