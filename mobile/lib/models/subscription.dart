enum SubscriptionStatus { ACTIVE, EXPIRED, CANCELLED }
enum PricingType { SUBSCRIPTION, PAY_PER_PICKUP }

class SubscriptionPlan {
  final String id;
  final String name;
  final double price;
  final String currency;
  final int pickupsPerWeek;
  final bool isActive;
  final String? description;

  SubscriptionPlan({
    required this.id,
    required this.name,
    required this.price,
    required this.currency,
    required this.pickupsPerWeek,
    required this.isActive,
    this.description,
  });

  factory SubscriptionPlan.fromJson(Map<String, dynamic> json) {
    return SubscriptionPlan(
      id: json['id'] as String,
      name: json['name'] as String,
      price: (json['price'] as num).toDouble(),
      currency: json['currency'] as String? ?? 'XAF',
      pickupsPerWeek: json['pickupsPerWeek'] as int,
      isActive: json['isActive'] as bool? ?? true,
      description: json['description'] as String?,
    );
  }
}

class UserSubscription {
  final String id;
  final String planId;
  final SubscriptionPlan? plan;
  final String startDate;
  final String endDate;
  final int remainingPickupsThisWeek;
  final String? weekResetDate;
  final SubscriptionStatus status;
  final DateTime? cancelledAt;

  UserSubscription({
    required this.id,
    required this.planId,
    this.plan,
    required this.startDate,
    required this.endDate,
    required this.remainingPickupsThisWeek,
    this.weekResetDate,
    required this.status,
    this.cancelledAt,
  });

  factory UserSubscription.fromJson(Map<String, dynamic> json) {
    final statusStr = json['status'] as String? ?? 'ACTIVE';
    final status = SubscriptionStatus.values.firstWhere(
      (s) => s.name == statusStr,
      orElse: () => SubscriptionStatus.ACTIVE,
    );
    return UserSubscription(
      id: json['id'] as String,
      planId: json['planId'] as String? ?? (json['plan']?['id'] as String? ?? ''),
      plan: json['plan'] != null
          ? SubscriptionPlan.fromJson(json['plan'] as Map<String, dynamic>)
          : null,
      startDate: json['startDate'] as String,
      endDate: json['endDate'] as String,
      remainingPickupsThisWeek: json['remainingPickupsThisWeek'] as int? ?? 0,
      weekResetDate: json['weekResetDate'] as String?,
      status: status,
      cancelledAt: json['cancelledAt'] != null
          ? DateTime.parse(json['cancelledAt'] as String)
          : null,
    );
  }

  bool get isActive => status == SubscriptionStatus.ACTIVE;
}

class PricingQuote {
  final double quotedPrice;
  final PricingType pricingType;
  final bool isCoveredBySubscription;
  final int? remainingPickupsThisWeek;
  final String? planName;
  final double perPickupPrice;
  final double? subscriptionPrice;
  final String? subscriptionSavingsMessage;

  PricingQuote({
    required this.quotedPrice,
    required this.pricingType,
    required this.isCoveredBySubscription,
    this.remainingPickupsThisWeek,
    this.planName,
    required this.perPickupPrice,
    this.subscriptionPrice,
    this.subscriptionSavingsMessage,
  });

  factory PricingQuote.fromJson(Map<String, dynamic> json) {
    final typeStr = json['pricingType'] as String? ?? 'PAY_PER_PICKUP';
    final type = PricingType.values.firstWhere(
      (t) => t.name == typeStr,
      orElse: () => PricingType.PAY_PER_PICKUP,
    );
    return PricingQuote(
      quotedPrice: (json['quotedPrice'] as num).toDouble(),
      pricingType: type,
      isCoveredBySubscription: json['isCoveredBySubscription'] as bool? ?? false,
      remainingPickupsThisWeek: json['remainingPickupsThisWeek'] as int?,
      planName: json['planName'] as String?,
      perPickupPrice: (json['perPickupPrice'] as num).toDouble(),
      subscriptionPrice: (json['subscriptionPrice'] as num?)?.toDouble(),
      subscriptionSavingsMessage: json['subscriptionSavingsMessage'] as String?,
    );
  }
}
