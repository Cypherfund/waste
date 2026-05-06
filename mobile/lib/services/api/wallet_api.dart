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
  PayoutConfig({required this.minWithdrawal, required this.maxWithdrawal, required this.methods});
  factory PayoutConfig.fromJson(Map<String, dynamic> j) => PayoutConfig(
        minWithdrawal: (j['minWithdrawal'] as num).toDouble(),
        maxWithdrawal: (j['maxWithdrawal'] as num).toDouble(),
        methods: (j['methods'] as List)
            .map((m) => PayoutMethod.fromJson(m as Map<String, dynamic>))
            .toList(),
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
        amount: (j['amount'] as num).toDouble(),
        method: j['method'] as String,
        accountNumber: j['accountNumber'] as String?,
        accountName: j['accountName'] as String?,
        status: j['status'] as String,
        adminNote: j['adminNote'] as String?,
        paidAt: j['paidAt'] != null ? DateTime.parse(j['paidAt'] as String) : null,
        createdAt: DateTime.parse(j['createdAt'] as String),
      );
}

class AppConfig {
  final bool paymentIntegrationEnabled;
  final String manualPaymentInstructions;
  final String supportWhatsapp;

  AppConfig({
    required this.paymentIntegrationEnabled,
    required this.manualPaymentInstructions,
    required this.supportWhatsapp,
  });

  factory AppConfig.fromJson(Map<String, dynamic> j) => AppConfig(
        paymentIntegrationEnabled: j['paymentIntegrationEnabled'] as bool? ?? false,
        manualPaymentInstructions: j['manualPaymentInstructions'] as String? ?? '',
        supportWhatsapp: j['supportWhatsapp'] as String? ?? '',
      );
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
    return (response.data as List)
        .map((p) => PayoutRequest.fromJson(p as Map<String, dynamic>))
        .toList();
  }
}
