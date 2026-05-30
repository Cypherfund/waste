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
  bool _isCashOnFirstPickup = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadPaymentMethods();
      final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
      setState(() {
        _hideCash = (args?['hideCash'] as bool?) ?? false;
        _subtitle = args?['subtitle'] as String?;
        _isCashOnFirstPickup = (args?['cashOnFirstPickup'] as bool?) ?? false;
      });
    });
  }

  void _loadPaymentMethods() {
    final userPaymentMethodsProvider = context.read<UserPaymentMethodsProvider>();
    userPaymentMethodsProvider.loadMethods(usage: 'CASHIN');
  }

  @override
  Widget build(BuildContext context) {
    // Cash on First Pickup flow - show confirmation instead of payment methods
    if (_isCashOnFirstPickup) {
      return _buildCashOnFirstPickupConfirmation();
    }

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
                  final hasSelectedMethod = flowProvider.selectedProviderId != null;

                  return Column(
                    children: [
                      Expanded(
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Amount card
                              _buildAmountCard(amount),
                              const SizedBox(height: 24),

                              // Wallet Balance section (hidden for wallet top-up)
                              if (!flowProvider.isWalletTopUpContext) ...[
                                _buildWalletBalanceSection(flowProvider, subProvider, amount),
                                const SizedBox(height: 24),
                              ],

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

                              // Cash option (hidden for wallet top-up and subscription contexts)
                              if ((appConfig?.cashEnabled ?? false) &&
                                  !_hideCash &&
                                  !flowProvider.isWalletTopUpContext &&
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
                        ),
                      ),
                      // Continue button
                      if (hasSelectedMethod)
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            border: Border(top: BorderSide(color: Color(0xFFE5E7EB))),
                          ),
                          child: SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: flowProvider.selectedProviderMode != null
                                  ? () => _navigateToPaymentScreen(flowProvider.selectedProviderMode!)
                                  : null,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF10B981),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: const Text(
                                'Continue',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
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

  Widget _buildWalletBalanceSection(
    PaymentFlowProvider flowProvider,
    SubscriptionProvider subProvider,
    double amount,
  ) {
    final walletBalance = subProvider.walletBalance ?? 0;
    final isSufficient = walletBalance >= amount;
    final isZero = walletBalance == 0;
    final isSelected = flowProvider.selectedProviderId == 'WALLET';

    return GestureDetector(
      onTap: isSufficient ? () => _payWithWallet(flowProvider, subProvider, amount) : null,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSufficient
              ? const Color(0xFFECFDF5)
              : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSufficient
                ? const Color(0xFF10B981)
                : Colors.grey.shade300,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.account_balance_wallet_outlined,
                  color: isSufficient
                      ? const Color(0xFF10B981)
                      : Colors.grey.shade600,
                  size: 24,
                ),
                const SizedBox(width: 8),
                Text(
                  'Wallet Balance',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: isSufficient
                        ? const Color(0xFF10B981)
                        : Colors.grey.shade800,
                  ),
                ),
                const Spacer(),
                if (isSufficient)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'Recommended',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            if (isSufficient) ...[
              Text(
                'Pay instantly from your wallet',
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey.shade700,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Text(
                    '${walletBalance.toStringAsFixed(0)} XAF',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF111827),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'available',
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ] else if (isZero) ...[
              Text(
                '0 XAF available',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Colors.grey.shade600,
                ),
              ),
              const SizedBox(height: 12),
              GestureDetector(
                onTap: () => Navigator.pushNamed(context, '/top-up-wallet'),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'Top up wallet',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ] else ...[
              Text(
                'Insufficient balance',
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey.shade700,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Text(
                    'Balance: ${walletBalance.toStringAsFixed(0)} XAF',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade600,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Need: ${(amount - walletBalance).toStringAsFixed(0)} XAF more',
                    style: TextStyle(
                      fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFFEF4444),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              GestureDetector(
                onTap: () => Navigator.pushNamed(context, '/top-up-wallet'),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'Top up wallet',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
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

    // Hide Wallet payment method for wallet top-up context
    final isWalletTopUp = flowProvider.isWalletTopUpContext;

    return Column(
      children: cashinMethods.where((method) {
        // Hide wallet payment method for top-up
        if (isWalletTopUp && method.paymentCode.toLowerCase() == 'wallet') {
          return false;
        }
        return true;
      }).map((method) {
        final isSelected = flowProvider.selectedProviderId == method.id;

        // Match against the provider config to get per-provider flags
        final providerConfig = appConfig?.cashinProviders
            .where((p) => p.paymentCode.toUpperCase() == method.paymentCode.toUpperCase())
            .firstOrNull;

        // Both global kill-switch AND per-provider flag must be true for integrated mode
        final integrationOn = (appConfig?.paymentIntegrationEnabled == true)
            && (providerConfig?.integrationEnabled ?? false);
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
            imageUrl: providerConfig?.imageUrl,
            onTap: () {
              flowProvider.selectPaymentMethod(
                providerId: method.id,
                providerName: method.providerName,
                mode: mode,
                paymentMethodCode: method.paymentCode,
              );
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
      case PaymentProviderMode.wallet:
        // Wallet payment is handled directly via _payWithWallet
        break;
    }
  }

  Future<void> _payWithWallet(
    PaymentFlowProvider flowProvider,
    SubscriptionProvider subProvider,
    double amount,
  ) async {
    // Show loading indicator
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(),
      ),
    );

    try {
      final walletApi = context.read<WalletApi>();

      if (flowProvider.isSubscriptionContext) {
        // Subscription payment with wallet
        final planId = flowProvider.subscriptionPlanId;
        if (planId == null) {
          throw Exception('Subscription plan ID not found');
        }

        await walletApi.paySubscriptionWithWallet(planId: planId);

        Navigator.pop(context); // Close loading
        Navigator.pushNamed(
          context,
          '/payment-result',
          arguments: {
            'isSuccess': true,
            'isSubscription': true,
            'title': 'Subscription Activated',
            'message': 'Your subscription has been activated successfully.',
          },
        );
      } else {
        // Job payment with wallet
        final job = flowProvider.createdJob;
        if (job == null) {
          throw Exception('Job not found in payment flow');
        }

        await walletApi.payJobWithWallet(jobId: job.id);

        Navigator.pop(context); // Close loading
        Navigator.pushNamed(
          context,
          '/payment-result',
          arguments: {
            'isSuccess': true,
            'isJob': true,
            'title': 'Payment Successful',
            'message': 'Your payment has been processed successfully.',
          },
        );
      }
    } catch (e) {
      Navigator.pop(context); // Close loading

      // Show error dialog
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Payment Failed'),
          content: Text(
            e.toString().contains('INSUFFICIENT_WALLET_BALANCE')
                ? 'Insufficient wallet balance. Please top up your wallet and try again.'
                : 'Payment failed. Please try again.',
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                // Refresh wallet balance on error
                subProvider.loadWalletBalance();
              },
              child: const Text('OK'),
            ),
          ],
        ),
      );
    }
  }

  Widget _buildCashOnFirstPickupConfirmation() {
    return Consumer<PaymentFlowProvider>(
      builder: (context, flowProvider, _) {
        final amount = flowProvider.amountDue;

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
              'Cash on First Pickup',
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
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Info card
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF8E1),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFFFA000)),
                          ),
                          child: Column(
                            children: [
                              Icon(Icons.info_outline, color: Colors.amber.shade700, size: 32),
                              const SizedBox(height: 12),
                              const Text(
                                'How it works',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF111827),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Pay ${amount.toStringAsFixed(0)} XAF in cash to the collector during your first pickup. Your subscription will be activated after payment is confirmed.',
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFF6B7280),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                        // Amount card
                        _buildAmountCard(amount),
                        const SizedBox(height: 24),
                        // Steps
                        const Text(
                          'What happens next',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF111827),
                          ),
                        ),
                        const SizedBox(height: 16),
                        _buildStep(
                          icon: Icons.calendar_today_outlined,
                          title: '1. Schedule your first pickup',
                          description: 'We\'ll create your subscription and schedule your first pickup.',
                        ),
                        const SizedBox(height: 12),
                        _buildStep(
                          icon: Icons.local_shipping_outlined,
                          title: '2. Collector arrives',
                          description: 'A collector will come to your location at the scheduled time.',
                        ),
                        const SizedBox(height: 12),
                        _buildStep(
                          icon: Icons.payments_outlined,
                          title: '3. Pay in cash',
                          description: 'Pay ${amount.toStringAsFixed(0)} XAF directly to the collector.',
                        ),
                        const SizedBox(height: 12),
                        _buildStep(
                          icon: Icons.check_circle_outline,
                          title: '4. Subscription activated',
                          description: 'Your subscription becomes active after payment confirmation.',
                        ),
                      ],
                    ),
                  ),
                ),
                // Confirm button
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border(top: BorderSide(color: Color(0xFFE5E7EB))),
                  ),
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => _confirmCashOnFirstPickup(flowProvider),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.amber.shade700,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        'Confirm & Schedule Pickup',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildStep({
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFFF3F4F6),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 20, color: const Color(0xFF6B7280)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF111827),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                description,
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF6B7280),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _confirmCashOnFirstPickup(PaymentFlowProvider flowProvider) async {
    final planId = flowProvider.cashFirstPickupPlanId;
    if (planId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Subscription plan not found')),
      );
      return;
    }

    // Show loading
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(),
      ),
    );

    try {
      // Call the backend API to subscribe with cash on first pickup
      // TODO: Move this to SubscriptionProvider
      // final apiClient = context.read<ApiClient>();
      // final result = await apiClient.post('/subscriptions/subscribe-cash-first-pickup', data: {
      //   'planId': planId,
      //   'scheduledDate': flowProvider.scheduledDate?.toIso8601String().split('T')[0],
      //   'scheduledTime': flowProvider.scheduledTime,
      //   'locationAddress': flowProvider.locationAddress,
      //   'locationLat': flowProvider.locationLat,
      //   'locationLng': flowProvider.locationLng,
      //   'notes': 'Cash on First Pickup subscription',
      // });

      // For now, use the regular subscribe method
      final subscriptionProvider = context.read<SubscriptionProvider>();
      final result = await subscriptionProvider.subscribeWithPayment(
        planId: planId,
        paymentMode: 'CASH_FIRST_PICKUP',
      );

      Navigator.pop(context); // Close loading

      // Show success and navigate
      Navigator.pushNamedAndRemoveUntil(
        context,
        '/payment-result',
        (route) => route.settings.name == '/home',
        arguments: {
          'isSuccess': true,
          'isSubscription': true,
          'title': 'Subscription Created',
          'message': 'Your subscription has been created. Pay ${flowProvider.amountDue.toStringAsFixed(0)} XAF in cash to the collector during your first pickup.',
        },
      );
    } catch (e) {
      Navigator.pop(context); // Close loading

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to create subscription: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}
