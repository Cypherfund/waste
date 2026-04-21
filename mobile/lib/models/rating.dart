class Rating {
  final String id;
  final String jobId;
  final String householdId;
  final String collectorId;
  final int value;
  final String? comment;
  final DateTime createdAt;

  Rating({
    required this.id,
    required this.jobId,
    required this.householdId,
    required this.collectorId,
    required this.value,
    this.comment,
    required this.createdAt,
  });

  factory Rating.fromJson(Map<String, dynamic> json) {
    return Rating(
      id: json['id'] as String,
      jobId: json['jobId'] as String,
      householdId: json['householdId'] as String,
      collectorId: json['collectorId'] as String,
      value: json['value'] as int,
      comment: json['comment'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
