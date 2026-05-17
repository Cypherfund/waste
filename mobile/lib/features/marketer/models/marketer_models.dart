class MarketerProfile {
  final String id;
  final String userId;
  final String name;
  final String phone;
  final String? email;
  final String referralCode;
  final String? territory;
  final String status;
  final int totalLeads;
  final int totalRegistered;
  final int totalQualified;
  final int totalExpired;
  final double conversionRate;
  final double qualificationRate;
  final double totalEarned;
  final double totalPaid;
  final double pendingAmount;
  final double approvedAmount;
  final int dailyLeadsCreated;
  final String createdAt;

  MarketerProfile({
    required this.id,
    required this.userId,
    required this.name,
    required this.phone,
    this.email,
    required this.referralCode,
    this.territory,
    required this.status,
    required this.totalLeads,
    required this.totalRegistered,
    required this.totalQualified,
    required this.totalExpired,
    required this.conversionRate,
    required this.qualificationRate,
    required this.totalEarned,
    required this.totalPaid,
    required this.pendingAmount,
    required this.approvedAmount,
    required this.dailyLeadsCreated,
    required this.createdAt,
  });

  factory MarketerProfile.fromJson(Map<String, dynamic> json) {
    return MarketerProfile(
      id: json['id'] ?? '',
      userId: json['userId'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      email: json['email'],
      referralCode: json['referralCode'] ?? '',
      territory: json['territory'],
      status: json['status'] ?? '',
      totalLeads: json['totalLeads'] ?? 0,
      totalRegistered: json['totalRegistered'] ?? 0,
      totalQualified: json['totalQualified'] ?? 0,
      totalExpired: json['totalExpired'] ?? 0,
      conversionRate: _toDouble(json['conversionRate']),
      qualificationRate: _toDouble(json['qualificationRate']),
      totalEarned: _toDouble(json['totalEarned']),
      totalPaid: _toDouble(json['totalPaid']),
      pendingAmount: _toDouble(json['pendingAmount']),
      approvedAmount: _toDouble(json['approvedAmount']),
      dailyLeadsCreated: json['dailyLeadsCreated'] ?? 0,
      createdAt: json['createdAt'] ?? '',
    );
  }
}

class MarketerDashboard {
  final DashboardProfile profile;
  final DashboardTodayStats todayStats;
  final DashboardTotals totals;
  final DashboardCommissions commissions;
  final List<GrowthLead> recentLeads;

  MarketerDashboard({
    required this.profile,
    required this.todayStats,
    required this.totals,
    required this.commissions,
    required this.recentLeads,
  });

  factory MarketerDashboard.fromJson(Map<String, dynamic> json) {
    return MarketerDashboard(
      profile: DashboardProfile.fromJson(json['profile'] ?? {}),
      todayStats: DashboardTodayStats.fromJson(json['todayStats'] ?? {}),
      totals: DashboardTotals.fromJson(json['totals'] ?? {}),
      commissions: DashboardCommissions.fromJson(json['commissions'] ?? {}),
      recentLeads: ((json['recentLeads'] ?? []) as List)
          .map((e) => GrowthLead.fromJson(e))
          .toList(),
    );
  }
}

class DashboardProfile {
  final String id;
  final String referralCode;
  final String? territory;
  final String status;

  DashboardProfile({required this.id, required this.referralCode, this.territory, required this.status});

  factory DashboardProfile.fromJson(Map<String, dynamic> json) {
    return DashboardProfile(
      id: json['id'] ?? '',
      referralCode: json['referralCode'] ?? '',
      territory: json['territory'],
      status: json['status'] ?? '',
    );
  }
}

class DashboardTodayStats {
  final int leadsCreated;
  final int leadsQualified;

  DashboardTodayStats({required this.leadsCreated, required this.leadsQualified});

  factory DashboardTodayStats.fromJson(Map<String, dynamic> json) {
    return DashboardTodayStats(
      leadsCreated: json['leadsCreated'] ?? 0,
      leadsQualified: json['leadsQualified'] ?? 0,
    );
  }
}

class DashboardTotals {
  final int totalLeads;
  final int totalRegistered;
  final int totalQualified;
  final int totalExpired;
  final double conversionRate;
  final double qualificationRate;

  DashboardTotals({
    required this.totalLeads,
    required this.totalRegistered,
    required this.totalQualified,
    required this.totalExpired,
    required this.conversionRate,
    required this.qualificationRate,
  });

  factory DashboardTotals.fromJson(Map<String, dynamic> json) {
    return DashboardTotals(
      totalLeads: json['totalLeads'] ?? 0,
      totalRegistered: json['totalRegistered'] ?? 0,
      totalQualified: json['totalQualified'] ?? 0,
      totalExpired: json['totalExpired'] ?? 0,
      conversionRate: _toDouble(json['conversionRate']),
      qualificationRate: _toDouble(json['qualificationRate']),
    );
  }
}

class DashboardCommissions {
  final double pending;
  final double approved;
  final double paid;
  final double totalEarned;

  DashboardCommissions({required this.pending, required this.approved, required this.paid, required this.totalEarned});

  factory DashboardCommissions.fromJson(Map<String, dynamic> json) {
    return DashboardCommissions(
      pending: _toDouble(json['pending']),
      approved: _toDouble(json['approved']),
      paid: _toDouble(json['paid']),
      totalEarned: _toDouble(json['totalEarned']),
    );
  }
}

class GrowthLead {
  final String id;
  final String marketerId;
  final String name;
  final String phone;
  final String type;
  final String? area;
  final String? notes;
  final String source;
  final String referralToken;
  final String referralCode;
  final String status;
  final String invitedAt;
  final String? registeredAt;
  final String? qualifiedAt;
  final String expiresAt;
  final String smsStatus;
  final int smsRetryCount;
  final String createdAt;

  GrowthLead({
    required this.id,
    required this.marketerId,
    required this.name,
    required this.phone,
    required this.type,
    this.area,
    this.notes,
    required this.source,
    required this.referralToken,
    required this.referralCode,
    required this.status,
    required this.invitedAt,
    this.registeredAt,
    this.qualifiedAt,
    required this.expiresAt,
    required this.smsStatus,
    required this.smsRetryCount,
    required this.createdAt,
  });

  factory GrowthLead.fromJson(Map<String, dynamic> json) {
    return GrowthLead(
      id: json['id'] ?? '',
      marketerId: json['marketerId'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      type: json['type'] ?? '',
      area: json['area'],
      notes: json['notes'],
      source: json['source'] ?? '',
      referralToken: json['referralToken'] ?? '',
      referralCode: json['referralCode'] ?? '',
      status: json['status'] ?? '',
      invitedAt: json['invitedAt'] ?? '',
      registeredAt: json['registeredAt'],
      qualifiedAt: json['qualifiedAt'],
      expiresAt: json['expiresAt'] ?? '',
      smsStatus: json['smsStatus'] ?? '',
      smsRetryCount: json['smsRetryCount'] ?? 0,
      createdAt: json['createdAt'] ?? '',
    );
  }
}

class CreateLeadRequest {
  final String name;
  final String phone;
  final String type;
  final String? area;
  final String? notes;

  CreateLeadRequest({required this.name, required this.phone, required this.type, this.area, this.notes});

  Map<String, dynamic> toJson() => {
    'name': name,
    'phone': phone,
    'type': type,
    if (area != null) 'area': area,
    if (notes != null) 'notes': notes,
  };
}

class CommissionItem {
  final String id;
  final String triggerType;
  final double amount;
  final String status;
  final String? description;
  final String createdAt;

  CommissionItem({
    required this.id,
    required this.triggerType,
    required this.amount,
    required this.status,
    this.description,
    required this.createdAt,
  });

  factory CommissionItem.fromJson(Map<String, dynamic> json) {
    return CommissionItem(
      id: json['id'] ?? '',
      triggerType: json['triggerType'] ?? '',
      amount: _toDouble(json['amount']),
      status: json['status'] ?? '',
      description: json['description'],
      createdAt: json['createdAt'] ?? '',
    );
  }
}

class CreatePayoutRequest {
  final double amount;
  final String method;
  final String accountNumber;
  final String? accountName;

  CreatePayoutRequest({required this.amount, required this.method, required this.accountNumber, this.accountName});

  Map<String, dynamic> toJson() => {
    'amount': amount,
    'method': method,
    'accountNumber': accountNumber,
    if (accountName != null) 'accountName': accountName,
  };
}

class PayoutItem {
  final String id;
  final double amount;
  final String method;
  final String accountNumber;
  final String? accountName;
  final String status;
  final String? adminNote;
  final String? paidAt;
  final String createdAt;

  PayoutItem({
    required this.id,
    required this.amount,
    required this.method,
    required this.accountNumber,
    this.accountName,
    required this.status,
    this.adminNote,
    this.paidAt,
    required this.createdAt,
  });

  factory PayoutItem.fromJson(Map<String, dynamic> json) {
    return PayoutItem(
      id: json['id'] ?? '',
      amount: _toDouble(json['amount']),
      method: json['method'] ?? '',
      accountNumber: json['accountNumber'] ?? '',
      accountName: json['accountName'],
      status: json['status'] ?? '',
      adminNote: json['adminNote'],
      paidAt: json['paidAt'],
      createdAt: json['createdAt'] ?? '',
    );
  }
}

class NotificationItem {
  final String id;
  final String type;
  final String title;
  final String message;
  final bool isRead;
  final String createdAt;

  NotificationItem({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    required this.isRead,
    required this.createdAt,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: json['id'] ?? '',
      type: json['type'] ?? '',
      title: json['title'] ?? '',
      message: json['message'] ?? '',
      isRead: json['isRead'] ?? false,
      createdAt: json['createdAt'] ?? '',
    );
  }
}

double _toDouble(dynamic val) {
  if (val == null) return 0.0;
  if (val is double) return val;
  if (val is int) return val.toDouble();
  if (val is String) return double.tryParse(val) ?? 0.0;
  return 0.0;
}
