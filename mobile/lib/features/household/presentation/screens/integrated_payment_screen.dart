import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/app_theme.dart';
import '../../../../providers/subscription_provider.dart';
import '../../../../providers/job_provider.dart';
import '../../../../services/api/wallet_api.dart';
import '../../providers/payment_flow_provider.dart';
import '../../providers/payment_flow_enums.dart';
import '../widgets/payment_method_card.dart';

/// Screen 3a: Integrated Payment
/// 
/// For payment providers with integration (e.g., Orange Money, MTN Mobile Money)
/// Shows payment confirmation before redirecting to provider's checkout
class IntegratedPaymentScreen extends StatefulWidget {
  const IntegratedPaymentScreen({super.key});

  @override
  State<IntegratedPaymentScreen> createState() => _IntegratedPaymentScreenState();
}

class _IntegratedPaymentScreenState extends State<IntegratedPaymentScreen> {
  bool _isProcessing = false;

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
          'Confirm Payment',
          style: TextStyle(
            color: Color(0xFF111827),
            fontSize: 13,
            fontWeight: FontWeight.w800,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Consumer2<PaymentFlowProvider, SubscriptionProvider>(
          builder: (context, flowProvider, subProvider, _) {
            final amount = flowProvider.amountDue;
            final providerName = flowProvider.selectedProviderName ?? 'Payment Provider';
            final paymentCode = flowProvider.selectedPaymentMethodCode;

            // Get provider image URL from app config
            final providerConfig = paymentCode != null
                ? subProvider.appConfig?.cashinProviders
                    .where((p) => p.paymentCode.toUpperCase() == paymentCode.toUpperCase())
                    .firstOrNull
                : null;
            final imageUrl = providerConfig?.imageUrl;

            return SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Payment method card
                  PaymentMethodCard(
                    providerId: flowProvider.selectedProviderId ?? '',
                    providerName: providerName,
                    mode: PaymentProviderMode.integrated,
                    isSelected: true,
                    imageUrl: imageUrl,
                    onTap: () {},
                  ),

                  const SizedBox(height: 24),

                  // Amount card
                  _buildAmountCard(amount),

                  const SizedBox(height: 24),

                  // Payment details
                  _buildPaymentDetailsCard(providerName, amount, flowProvider),

                  const SizedBox(height: 24),

                  // Info note
                  _buildInfoCard(),

                  const SizedBox(height: 32),

                  // Pay button
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        elevation: 0,
                        disabledBackgroundColor: Colors.grey.shade300,
                      ),
                      onPressed: _isProcessing ? null : _processPayment,
                      child: _isProcessing
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : const Text(
                              'Pay Now',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildAmountCard(double amount) {
    return Consumer<PaymentFlowProvider>(
      builder: (context, flowProvider, _) {
        final subtitle = flowProvider.isWalletTopUpContext
            ? 'Wallet top-up'
            : flowProvider.isSubscriptionContext
                ? 'Subscription payment'
                : 'For one waste pickup';

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
                subtitle,
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey.shade600,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPaymentDetailsCard(String providerName, double amount, PaymentFlowProvider flowProvider) {
    String paymentType;
    if (flowProvider.isWalletTopUpContext) {
      paymentType = 'Wallet top-up';
    } else if (flowProvider.isSubscriptionContext) {
      paymentType = 'Subscription payment';
    } else {
      paymentType = 'One-time payment';
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Payment Details',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: Colors.grey.shade800,
            ),
          ),
          const SizedBox(height: 16),
          _buildDetailRow('Payment Method', providerName),
          const SizedBox(height: 12),
          _buildDetailRow('Amount', '${amount.toStringAsFixed(0)} XAF'),
          const SizedBox(height: 12),
          _buildDetailRow('Type', paymentType),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey.shade600,
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Color(0xFF111827),
          ),
        ),
      ],
    );
  }

  Widget _buildInfoCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFDBEAFE)),
      ),
      child: Row(
        children: [
          Icon(
            Icons.info_outline,
            size: 20,
            color: Colors.blue.shade700,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'You will be redirected to complete your payment securely',
              style: TextStyle(
                fontSize: 13,
                color: Colors.blue.shade900,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _processPayment() async {
    setState(() => _isProcessing = true);

    try {
      final flowProvider = context.read<PaymentFlowProvider>();

      // ── Wallet top-up integrated payment branch ───────────────────
      if (flowProvider.isWalletTopUpContext) {
        final walletApi = WalletApi(ApiClient());
        await walletApi.topUp(
          amount: flowProvider.walletTopUpAmount!,
          paymentMethodId: flowProvider.selectedProviderId!,
        );

        if (!mounted) return;

        flowProvider.setResultType(PaymentResultType.submitted);

        Navigator.pushNamedAndRemoveUntil(
          context,
          '/payment-result',
          (route) => route.settings.name == '/home',
          arguments: {
            'resultType': PaymentResultType.submitted,
            'isWalletTopUp': true,
            'amount': flowProvider.walletTopUpAmount,
          },
        );
        return;
      }

      // ── Subscription integrated payment branch ───────────────────
      if (flowProvider.isSubscriptionContext) {
        final subProvider = context.read<SubscriptionProvider>();
        final subscription = await subProvider.subscribeWithPayment(
          planId: flowProvider.subscriptionPlanId!,
          paymentMode: 'INTEGRATED_PROVIDER',
          paymentPhone: flowProvider.paymentPhone,
        );

        if (!mounted) return;

        if (subscription == null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(subProvider.error ?? 'Failed to initiate subscription payment'),
              backgroundColor: Colors.red.shade600,
            ),
          );
          return;
        }

        // Store transaction ID if returned, then poll
        if (subscription.providerTransactionId != null) {
          flowProvider.setProviderTransactionId(subscription.providerTransactionId!);
        }
        Navigator.pushNamed(context, '/payment-processing');
        return;
      }

      // ── Job integrated payment branch ────────────────────────────
      final jobProvider = context.read<JobProvider>();

      final job = await jobProvider.createJob(
        scheduledDate: flowProvider.scheduledDate!,
        scheduledTime: flowProvider.scheduledTime!,
        locationAddress: flowProvider.fullAddress,
        locationLat: flowProvider.locationLat,
        locationLng: flowProvider.locationLng,
        notes: 'Integrated payment: ${flowProvider.selectedProviderName}',
        paymentMode: 'INTEGRATED_PROVIDER',
        paymentMethod: flowProvider.selectedPaymentMethodCode,
      );

      if (!mounted) return;

      if (job == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(jobProvider.error ?? 'Failed to create booking'),
            backgroundColor: Colors.red.shade600,
          ),
        );
        return;
      }

      flowProvider.setCreatedJob(job);
      flowProvider.setResultType(PaymentResultType.submitted);

      Navigator.pushNamedAndRemoveUntil(
        context,
        '/payment-result',
        (route) => route.settings.name == '/home',
        arguments: {
          'resultType': PaymentResultType.submitted,
          'job': job,
        },
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to initiate payment: $e'),
          backgroundColor: Colors.red.shade600,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }
}
