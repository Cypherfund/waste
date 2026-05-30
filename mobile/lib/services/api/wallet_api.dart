import 'api_client.dart';

class PayoutMethod {
  final String key;
  final String label;
  PayoutMethod({required this.key, required this.label});
  factory PayoutMethod.fromJson(Map<String, dynamic> j) =>
      PayoutMethod(key: j['key'] as String, label: j['label'] as String);
}

class PayoutConfig {
  final double minWithdrawal;
  final double maxWithdrawal;
  final List<PayoutMethod> methods;
  final String payoutMode;
  final List<PaymentProvider> cashoutProviders;
  PayoutConfig({
    required this.minWithdrawal,
    required this.maxWithdrawal,
    required this.methods,
    this.payoutMode = 'MANUAL_APPROVAL',
    this.cashoutProviders = const [],
  });
  factory PayoutConfig.fromJson(Map<String, dynamic> j) => PayoutConfig(
        minWithdrawal: (j['minWithdrawal'] as num).toDouble(),
        maxWithdrawal: (j['maxWithdrawal'] as num).toDouble(),
        methods: (j['methods'] as List)
            .map((m) => PayoutMethod.fromJson(m as Map<String, dynamic>))
            .toList(),
        payoutMode: j['payoutMode'] as String? ?? 'MANUAL_APPROVAL',
        cashoutProviders: (j['cashoutProviders'] as List<dynamic>?)
                ?.map((p) => PaymentProvider.fromJson(p as Map<String, dynamic>))
                .toList() ??
            [],
      );
}

class PayoutRequest {
  final String id;
  final double amount;
  final String method;
  final String? accountNumber;
  final String? accountName;
  final String status;
  final String? adminNote;
  final DateTime? paidAt;
  final DateTime createdAt;

  PayoutRequest({
    required this.id,
    required this.amount,
    required this.method,
    this.accountNumber,
    this.accountName,
    required this.status,
    this.adminNote,
    this.paidAt,
    required this.createdAt,
  });

  factory PayoutRequest.fromJson(Map<String, dynamic> j) => PayoutRequest(
        id: j['id'] as String,
        amount: double.parse(j['amount'].toString()),
        method: j['method'] as String,
        accountNumber: j['accountNumber'] as String?,
        accountName: j['accountName'] as String?,
        status: j['status'] as String,
        adminNote: j['adminNote'] as String?,
        paidAt: j['paidAt'] != null ? DateTime.parse(j['paidAt'] as String) : null,
        createdAt: DateTime.parse(j['createdAt'] as String),
      );
}

class PaymentProvider {
  final String paymentCode;
  final String providerName;
  final String? manualPaymentPhone;
  final String? manualPaymentAccountName;
  final String? manualInstructions;
  final bool integrationEnabled;
  final bool manualInstructionsEnabled;
  final bool manualProofRequired;
  final bool supportsCashin;
  final bool supportsCashout;
  final double? minWithdrawal;
  final double? maxWithdrawal;
  final double? minDeposit;
  final double? maxDeposit;
  final String? imageUrl;

  PaymentProvider({
    required this.paymentCode,
    required this.providerName,
    this.manualPaymentPhone,
    this.manualPaymentAccountName,
    this.manualInstructions,
    this.integrationEnabled = false,
    this.manualInstructionsEnabled = true,
    this.manualProofRequired = false,
    this.supportsCashin = false,
    this.supportsCashout = false,
    this.minWithdrawal,
    this.maxWithdrawal,
    this.minDeposit,
    this.maxDeposit,
    this.imageUrl,
  });

  factory PaymentProvider.fromJson(Map<String, dynamic> j) => PaymentProvider(
        paymentCode: j['paymentCode'] as String,
        providerName: j['providerName'] as String,
        manualPaymentPhone: j['manualPaymentPhone'] as String?,
        manualPaymentAccountName: j['manualPaymentAccountName'] as String?,
        manualInstructions: j['manualInstructions'] as String?,
        integrationEnabled: j['integrationEnabled'] as bool? ?? false,
        manualInstructionsEnabled: j['manualInstructionsEnabled'] as bool? ?? true,
        manualProofRequired: j['manualProofRequired'] as bool? ?? false,
        supportsCashin: j['supportsCashin'] as bool? ?? false,
        supportsCashout: j['supportsCashout'] as bool? ?? false,
        minWithdrawal: (j['minWithdrawal'] as num?)?.toDouble(),
        maxWithdrawal: (j['maxWithdrawal'] as num?)?.toDouble(),
        minDeposit: (j['minDeposit'] as num?)?.toDouble(),
        maxDeposit: (j['maxDeposit'] as num?)?.toDouble(),
        imageUrl: j['imageUrl'] as String?,
      );

  bool get hasManualPaymentDetails =>
      manualPaymentPhone != null && manualPaymentPhone!.isNotEmpty;
}

class UserPaymentMethod {
  final String id;
  final String paymentCode;
  final String providerName;
  final String accountNumber;       // use only when submitting payment/payout
  final String maskedAccountNumber; // display always
  final String? accountName;
  final String usageType;           // 'CASHIN' | 'CASHOUT' | 'BOTH'
  final bool isDefault;
  final bool supportsCashin;
  final bool supportsCashout;

  UserPaymentMethod({
    required this.id,
    required this.paymentCode,
    required this.providerName,
    required this.accountNumber,
    required this.maskedAccountNumber,
    this.accountName,
    required this.usageType,
    required this.isDefault,
    required this.supportsCashin,
    required this.supportsCashout,
  });

  factory UserPaymentMethod.fromJson(Map<String, dynamic> j) => UserPaymentMethod(
        id: j['id'] as String,
        paymentCode: j['paymentCode'] as String,
        providerName: j['providerName'] as String,
        accountNumber: j['accountNumber'] as String,
        maskedAccountNumber: j['maskedAccountNumber'] as String,
        accountName: j['accountName'] as String?,
        usageType: j['usageType'] as String,
        isDefault: j['isDefault'] as bool,
        supportsCashin: j['supportsCashin'] as bool,
        supportsCashout: j['supportsCashout'] as bool,
      );
}

class AppConfig {
  final bool paymentIntegrationEnabled;
  final bool cashEnabled;
  final String manualPaymentInstructions;
  final String supportWhatsapp;
  final String supportPhone;
  final String supportEmail;
  final List<PaymentProvider> paymentProviders;
  final List<PaymentProvider> cashinProviders;
  final int minAdvanceHours;
  final int maxAdvanceDays;
  final bool topupEnabled;
  final double topupMinAmount;
  final double topupMaxAmount;
  final List<int> topupQuickAmounts;
  final int acceptTimeoutMinutes;

  AppConfig({
    required this.paymentIntegrationEnabled,
    this.cashEnabled = false,
    required this.manualPaymentInstructions,
    required this.supportWhatsapp,
    this.supportPhone = '',
    this.supportEmail = '',
    required this.paymentProviders,
    this.cashinProviders = const [],
    this.minAdvanceHours = 24,
    this.maxAdvanceDays = 30,
    this.topupEnabled = true,
    this.topupMinAmount = 500,
    this.topupMaxAmount = 500000,
    this.topupQuickAmounts = const [1000, 3500, 5000, 10000],
    this.acceptTimeoutMinutes = 25,
  });

  factory AppConfig.fromJson(Map<String, dynamic> j) => AppConfig(
        paymentIntegrationEnabled: j['paymentIntegrationEnabled'] as bool? ?? false,
        cashEnabled: j['cashEnabled'] as bool? ?? false,
        manualPaymentInstructions: j['manualPaymentInstructions'] as String? ?? '',
        supportWhatsapp: j['supportWhatsapp'] as String? ?? '',
        supportPhone: j['supportPhone'] as String? ?? '',
        supportEmail: j['supportEmail'] as String? ?? '',
        paymentProviders: (j['paymentProviders'] as List<dynamic>?)
                ?.map((p) => PaymentProvider.fromJson(p as Map<String, dynamic>))
                .toList() ??
            [],
        cashinProviders: (j['cashinProviders'] as List<dynamic>?)
                ?.map((p) => PaymentProvider.fromJson(p as Map<String, dynamic>))
                .toList() ??
            [],
        minAdvanceHours: j['minAdvanceHours'] as int? ?? 24,
        maxAdvanceDays: j['maxAdvanceDays'] as int? ?? 30,
        topupEnabled: j['topupEnabled'] as bool? ?? true,
        topupMinAmount: (j['topupMinAmount'] as num?)?.toDouble() ?? 500,
        topupMaxAmount: (j['topupMaxAmount'] as num?)?.toDouble() ?? 500000,
        topupQuickAmounts: (j['topupQuickAmounts'] as List<dynamic>?)
                ?.map((a) => (a as num).toInt())
                .toList() ??
            [1000, 3500, 5000, 10000],
        acceptTimeoutMinutes: j['acceptTimeoutMinutes'] as int? ?? 25,
      );

  /// Get providers that have manual instructions enabled or manual payment details configured
  List<PaymentProvider> get enabledManualPaymentProviders =>
      paymentProviders.where((p) => p.manualInstructionsEnabled || p.hasManualPaymentDetails).toList();
}

class PaymentTransaction {
  final String id;
  final String type; // 'CASHIN', 'CASHOUT', 'REFUND', etc.
  final double amount;
  final String status; // 'PENDING', 'COMPLETED', 'FAILED'
  final DateTime createdAt;
  final String? providerName;
  final String? paymentCode;
  final String? jobId;
  final String? description;

  PaymentTransaction({
    required this.id,
    required this.type,
    required this.amount,
    required this.status,
    required this.createdAt,
    this.providerName,
    this.paymentCode,
    this.jobId,
    this.description,
  });

  factory PaymentTransaction.fromJson(Map<String, dynamic> j) => PaymentTransaction(
        id: j['id'] as String,
        type: j['type'] as String,
        amount: (j['amount'] as num).toDouble(),
        status: j['status'] as String,
        createdAt: DateTime.parse(j['createdAt'] as String),
        providerName: j['providerName'] as String?,
        paymentCode: j['paymentCode'] as String?,
        jobId: j['jobId'] as String?,
        description: j['description'] as String?,
      );

  bool get isCredit => type == 'CASHIN' || type == 'REFUND';
  bool get isDebit => type == 'CASHOUT' || type == 'PAYMENT';
}

class WalletApi {
  final ApiClient _client;
  WalletApi(this._client);

  Future<AppConfig> getAppConfig() async {
    final response = await _client.dio.get('/wallet/app-config');
    return AppConfig.fromJson(response.data as Map<String, dynamic>);
  }

  Future<double> getBalance() async {
    final response = await _client.dio.get('/wallet/balance');
    return ((response.data as Map<String, dynamic>)['balance'] as num).toDouble();
  }

  Future<PayoutConfig> getPayoutConfig() async {
    final response = await _client.dio.get('/wallet/payout-config');
    return PayoutConfig.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PayoutRequest> requestWithdrawal({
    required double amount,
    required String method,
    String? accountNumber,
    String? accountName,
  }) async {
    final response = await _client.dio.post('/wallet/withdraw', data: {
      'amount': amount,
      'method': method,
      if (accountNumber != null) 'accountNumber': accountNumber,
      if (accountName != null) 'accountName': accountName,
    });
    return PayoutRequest.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<PayoutRequest>> getMyPayouts() async {
    final response = await _client.dio.get('/wallet/payouts');
    final data = response.data;
    final List list;
    if (data is List) {
      list = data;
    } else if (data is Map) {
      list = (data['data'] ?? data['payouts'] ?? data['items'] ?? []) as List;
    } else {
      list = [];
    }
    return list
        .map((p) => PayoutRequest.fromJson(p as Map<String, dynamic>))
        .toList();
  }

  Future<List<PaymentTransaction>> getMyTransactions({int limit = 20}) async {
    final response = await _client.dio.get('/payments/my-transactions', queryParameters: {'limit': limit});
    return (response.data as List)
        .map((t) => PaymentTransaction.fromJson(t as Map<String, dynamic>))
        .toList();
  }

  // ── USER PAYMENT METHODS ────────────────────────────────────────

  Future<List<UserPaymentMethod>> getMyPaymentMethods({String? usage}) async {
    final response = await _client.dio.get(
      '/wallet/payment-methods',
      queryParameters: usage != null ? {'usage': usage} : null,
    );
    final data = response.data;
    final List list = data is List ? data : (data['data'] ?? data['methods'] ?? []) as List;
    return list
        .map((m) => UserPaymentMethod.fromJson(m as Map<String, dynamic>))
        .toList();
  }

  Future<UserPaymentMethod> addPaymentMethod({
    required String paymentCode,
    required String accountNumber,
    String? accountName,
    String? usageType,
    bool? isDefault,
  }) async {
    final response = await _client.dio.post('/wallet/payment-methods', data: {
      'paymentCode': paymentCode,
      'accountNumber': accountNumber,
      if (accountName != null) 'accountName': accountName,
      if (usageType != null) 'usageType': usageType,
      if (isDefault != null) 'isDefault': isDefault,
    });
    return UserPaymentMethod.fromJson(response.data as Map<String, dynamic>);
  }

  Future<UserPaymentMethod> updatePaymentMethod(
    String id, {
    String? accountNumber,
    String? accountName,
  }) async {
    final response = await _client.dio.patch('/wallet/payment-methods/$id', data: {
      if (accountNumber != null) 'accountNumber': accountNumber,
      if (accountName != null) 'accountName': accountName,
    });
    return UserPaymentMethod.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> deletePaymentMethod(String id) async {
    await _client.dio.delete('/wallet/payment-methods/$id');
  }

  Future<UserPaymentMethod> setDefaultPaymentMethod(String id, String usage) async {
    final response = await _client.dio.patch(
      '/wallet/payment-methods/$id/default',
      queryParameters: {'usage': usage},
    );
    return UserPaymentMethod.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> topUp({
    required double amount,
    required String paymentMethodId,
    String? paymentRef,
    String? paymentProofUrl,
  }) async {
    await _client.dio.post('/wallet/top-up', data: {
      'amount': amount,
      'paymentMethodId': paymentMethodId,
      if (paymentRef != null) 'paymentRef': paymentRef,
      if (paymentProofUrl != null) 'paymentProofUrl': paymentProofUrl,
    });
  }

  Future<Map<String, dynamic>> payJobWithWallet({required String jobId}) async {
    final response = await _client.dio.post('/wallet/pay-job', data: {
      'jobId': jobId,
    });
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> paySubscriptionWithWallet({required String planId}) async {
    final response = await _client.dio.post('/wallet/pay-subscription', data: {
      'planId': planId,
    });
    return response.data as Map<String, dynamic>;
  }
}
