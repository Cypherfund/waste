enum EarningStatus {
  PENDING,
  CONFIRMED,
  PAID;

  static EarningStatus fromString(String value) {
    return EarningStatus.values.firstWhere(
      (e) => e.name == value,
      orElse: () => EarningStatus.PENDING,
    );
  }
}

class Earning {
  final String id;
  final String jobId;
  final String collectorId;
  final double baseAmount;
  final double distanceAmount;
  final double surgeMultiplier;
  final double totalAmount;
  final EarningStatus status;
  final DateTime? confirmedAt;
  final DateTime createdAt;

  Earning({
    required this.id,
    required this.jobId,
    required this.collectorId,
    required this.baseAmount,
    required this.distanceAmount,
    required this.surgeMultiplier,
    required this.totalAmount,
    required this.status,
    this.confirmedAt,
    required this.createdAt,
  });

  factory Earning.fromJson(Map<String, dynamic> json) {
    return Earning(
      id: json['id'] as String,
      jobId: json['jobId'] as String,
      collectorId: json['collectorId'] as String,
      baseAmount: (json['baseAmount'] as num).toDouble(),
      distanceAmount: (json['distanceAmount'] as num).toDouble(),
      surgeMultiplier: (json['surgeMultiplier'] as num).toDouble(),
      totalAmount: (json['totalAmount'] as num).toDouble(),
      status: EarningStatus.fromString(json['status'] as String),
      confirmedAt: json['confirmedAt'] != null
          ? DateTime.parse(json['confirmedAt'] as String)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

class EarningsSummary {
  final double totalEarnings;
  final double pendingEarnings;
  final double confirmedEarnings;
  final int jobCount;
  final List<Earning> earnings;

  EarningsSummary({
    required this.totalEarnings,
    required this.pendingEarnings,
    required this.confirmedEarnings,
    required this.jobCount,
    required this.earnings,
  });

  factory EarningsSummary.fromJson(Map<String, dynamic> json) {
    return EarningsSummary(
      totalEarnings: (json['totalEarnings'] as num).toDouble(),
      pendingEarnings: (json['pendingEarnings'] as num).toDouble(),
      confirmedEarnings: (json['confirmedEarnings'] as num).toDouble(),
      jobCount: json['jobCount'] as int,
      earnings: (json['earnings'] as List)
          .map((e) => Earning.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class EarningsQuickSummary {
  final double today;
  final double thisWeek;
  final double thisMonth;
  final double allTime;

  EarningsQuickSummary({
    required this.today,
    required this.thisWeek,
    required this.thisMonth,
    required this.allTime,
  });

  factory EarningsQuickSummary.fromJson(Map<String, dynamic> json) {
    return EarningsQuickSummary(
      today: (json['today'] as num).toDouble(),
      thisWeek: (json['thisWeek'] as num).toDouble(),
      thisMonth: (json['thisMonth'] as num).toDouble(),
      allTime: (json['allTime'] as num).toDouble(),
    );
  }
}
