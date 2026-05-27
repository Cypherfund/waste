import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/app_theme.dart';
import '../../../shared/payment_methods_setup_screen.dart';
import '../../../../providers/subscription_provider.dart';
import '../../../../providers/user_payment_methods_provider.dart';
import '../../../../services/api/wallet_api.dart';
import '../../providers/payment_flow_provider.dart';
import '../../providers/payment_flow_enums.dart';
import '../widgets/payment_method_card.dart';

/// Screen 2: Choose Payment Method
/// 
/// Shows available payment methods (MTN/Orange/Cash) based on configuration
class ChoosePaymentMethodScreen extends StatefulWidget {
  const ChoosePaymentMethodScreen({super.key});

  @override
  State<ChoosePaymentMethodScreen> createState() => _ChoosePaymentMethodScreenState();
}

class _ChoosePaymentMethodScreenState extends State<ChoosePaymentMethodScreen> {
  bool _hideCash = false;
  String? _subtitle;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadPaymentMethods();
      final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
      setState(() {
        _hideCash = (args?['hideCash'] as bool?) ?? false;
        _subtitle = args?['subtitle'] as String?;
      });
    });
  }

  void _loadPaymentMethods() {
    final userPaymentMethodsProvider = context.read<UserPaymentMethodsProvider>();
    userPaymentMethodsProvider.loadMethods(usage: 'CASHIN');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leadingWidth: 44,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            color: Color(0xFF111827),
            size: 16,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Choose Payment Method',
          style: TextStyle(
            color: Color(0xFF111827),
            fontSize: 13,
            fontWeight: FontWeight.w800,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Column(
          children: [
            const Divider(height: 1, thickness: 1, color: Color(0xFFE5E7EB)),
            Expanded(
              child: Consumer3<
                PaymentFlowProvider,
                SubscriptionProvider,
                UserPaymentMethodsProvider
              >(
                builder: (context, flowProvider, subProvider, userPaymentProvider, _) {
                  final amount = flowProvider.amountDue;
                  final appConfig = subProvider.appConfig;

                  return SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Amount card
                        _buildAmountCard(amount),
                        const SizedBox(height: 24),

                        // Payment methods
                        Text(
                          'Select Payment Method',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: Colors.grey.shade800,
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Provider methods (MTN/Orange)
                        if (userPaymentProvider.loading)
                          const Center(child: CircularProgressIndicator())
                        else if (userPaymentProvider.error != null)
                          _buildErrorState(userPaymentProvider.error!)
                        else
                          _buildPaymentMethods(userPaymentProvider, flowProvider, appConfig),

                        const SizedBox(height: 24),

                        // Cash option (hidden for subscription context)
                        if ((appConfig?.cashEnabled ?? false) &&
                            !_hideCash &&
                            !flowProvider.isSubscriptionContext) ...[
                          Text(
                            'Or pay with',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: Colors.grey.shade800,
                            ),
                          ),
                          const SizedBox(height: 12),
                          _buildCashOption(flowProvider),
                        ],
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAmountCard(double amount) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        children: [
          const Text(
            'Amount to pay',
            style: TextStyle(
              fontSize: 14,
              color: Color(0xFF6B7280),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${amount.toStringAsFixed(0)} XAF',
            style: const TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.w800,
              color: Color(0xFF111827),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _subtitle ?? 'For one waste pickup',
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentMethods(
    UserPaymentMethodsProvider userPaymentProvider,
    PaymentFlowProvider flowProvider,
    AppConfig? appConfig,
  ) {
    final cashinMethods = userPaymentProvider.cashinMethods;

    if (cashinMethods.isEmpty) {
      return _buildEmptyState();
    }

    return Column(
      children: cashinMethods.map((method) {
        final isSelected = flowProvider.selectedProviderId == method.id;

        // Match against the provider config to get per-provider flags
        final providerConfig = appConfig?.cashinProviders
            .where((p) => p.paymentCode.toUpperCase() == method.paymentCode.toUpperCase())
            .firstOrNull;

        // Use per-provider integrationEnabled; fall back to global flag only if no provider config found
        final integrationOn = providerConfig?.integrationEnabled
            ?? (appConfig?.paymentIntegrationEnabled == true);
        final mode = integrationOn
            ? PaymentProviderMode.integrated
            : PaymentProviderMode.manual;

        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: PaymentMethodCard(
            providerId: method.id,
            providerName: method.providerName,
            mode: mode,
            isSelected: isSelected,
            onTap: () {
              flowProvider.selectPaymentMethod(
                providerId: method.id,
                providerName: method.providerName,
                mode: mode,
                paymentMethodCode: method.paymentCode,
              );
              _navigateToPaymentScreen(mode);
            },
          ),
        );
      }).toList(),
    );
  }

  Widget _buildCashOption(PaymentFlowProvider flowProvider) {
    final isSelected = flowProvider.selectedProviderId == 'CASH';

    return PaymentMethodCard(
      providerId: 'CASH',
      providerName: 'Cash to Collector',
      mode: PaymentProviderMode.cash,
      isSelected: isSelected,
      onTap: () {
        flowProvider.selectCash();
        Navigator.pushNamed(context, '/cash-confirmation');
      },
      customIcon: Icons.payments_outlined,
    );
  }

  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        children: [
          Icon(
            Icons.payment_outlined,
            size: 48,
            color: Colors.grey.shade400,
          ),
          const SizedBox(height: 16),
          Text(
            'No payment methods available',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.grey.shade700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Add a payment method to continue',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 16),
          TextButton.icon(
            onPressed: () {
              Navigator.pushNamed(
                context,
                '/payment-methods-setup',
                arguments: {'mode': 'cashin'},
              );
            },
            icon: const Icon(Icons.add),
            label: const Text('Add Payment Method'),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(String error) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        children: [
          Icon(Icons.wifi_off_rounded, size: 40, color: Colors.grey.shade400),
          const SizedBox(height: 12),
          Text(
            error,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 16),
          TextButton.icon(
            onPressed: _loadPaymentMethods,
            icon: const Icon(Icons.refresh_rounded, size: 16),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  void _navigateToPaymentScreen(PaymentProviderMode mode) {
    switch (mode) {
      case PaymentProviderMode.manual:
        Navigator.pushNamed(context, '/manual-payment');
        break;
      case PaymentProviderMode.integrated:
        Navigator.pushNamed(context, '/integrated-payment');
        break;
      case PaymentProviderMode.cash:
        Navigator.pushNamed(context, '/cash-confirmation');
        break;
    }
  }
}
