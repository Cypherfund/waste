import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/app_theme.dart';
import '../../../../models/job.dart';
import '../../../../models/subscription.dart';
import '../../providers/payment_flow_provider.dart';
import '../../providers/payment_flow_enums.dart';
import '../widgets/payment_timeline.dart';

/// Screen 7: Payment Result Screen (Shared Component)
/// 
/// Four variants:
/// - submitted: Manual payment submitted, awaiting verification
/// - success: Integrated payment successful
/// - failed: Payment failed/rejected
/// - cash: Cash booking created
class PaymentResultScreen extends StatelessWidget {
  final Map<String, dynamic> arguments;

  const PaymentResultScreen({
    super.key,
    required this.arguments,
  });

  @override
  Widget build(BuildContext context) {
    final resultType = arguments['resultType'] as PaymentResultType;
    final isSubscription = arguments['isSubscription'] as bool? ?? false;
    final subscription = arguments['subscription'] as UserSubscription?;
    final job = arguments['job'] as Job?;

    // Subscription result variants (no Job required)
    if (isSubscription) {
      switch (resultType) {
        case PaymentResultType.submitted:
          return _SubscriptionSubmittedVariant(subscription: subscription);
        case PaymentResultType.success:
          return _SubscriptionActivatedVariant(subscription: subscription);
        case PaymentResultType.failed:
          final reason = arguments['failureReason'] as String?;
          return _SubscriptionFailedVariant(reason: reason);
        default:
          break;
      }
    }

    if (job == null) {
      return const Scaffold(
        body: Center(child: Text('No job data available')),
      );
    }

    switch (resultType) {
      case PaymentResultType.submitted:
        return _SubmittedVariant(job: job);
      case PaymentResultType.success:
        return _SuccessVariant(job: job);
      case PaymentResultType.failed:
        final reason = arguments['failureReason'] as String?;
        return _FailedVariant(job: job, reason: reason);
      case PaymentResultType.cash:
        final isFree = arguments['isFree'] as bool? ?? false;
        return _CashVariant(job: job, isFree: isFree);
    }
  }
}

/// Variant A: Manual Submitted
class _SubmittedVariant extends StatelessWidget {
  final Job job;

  const _SubmittedVariant({required this.job});

  @override
  Widget build(BuildContext context) {
    return _ResultScreenTemplate(
      icon: Icons.schedule,
      iconColor: const Color(0xFFFFA000),
      iconBackgroundColor: const Color(0xFFFFF8E1),
      title: 'Payment sent for verification',
      subtitle: 'We have received your payment details. An admin will verify shortly.',
      job: job,
      details: _buildDetailsCard(),
      primaryAction: _buildPrimaryAction(context),
      secondaryAction: _buildSecondaryAction(context),
    );
  }

  Widget _buildDetailsCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        children: [
          _buildDetailRow('Amount', '${job.quotedPrice?.toStringAsFixed(0) ?? '0'} XAF'),
          const Divider(height: 16, color: Color(0xFFE5E7EB)),
          _buildDetailRow('Method', job.paymentMethodName ?? job.paymentMethod ?? 'Mobile Money'),
          const Divider(height: 16, color: Color(0xFFE5E7EB)),
          _buildDetailRow('Reference', job.paymentRef ?? '-'),
          const Divider(height: 16, color: Color(0xFFE5E7EB)),
          _buildDetailRowWithBadge(
            'Status', 
            'Awaiting verification',
            const Color(0xFFFFF8E1),
            const Color(0xFFFFA000),
          ),
        ],
      ),
    );
  }

  Widget _buildPrimaryAction(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
        onPressed: () => _navigateToBookingDetails(context, job: job),
        child: const Text(
          'View Booking Status',
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }

  Widget _buildSecondaryAction(BuildContext context) {
    return TextButton(
      onPressed: () => _navigateHome(context),
      child: Text(
        'Back to Home',
        style: TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          color: Colors.grey.shade700,
        ),
      ),
    );
  }
}

/// Variant B: Success (Integrated)
class _SuccessVariant extends StatelessWidget {
  final Job job;

  const _SuccessVariant({required this.job});

  @override
  Widget build(BuildContext context) {
    return _ResultScreenTemplate(
      icon: Icons.check_circle,
      iconColor: AppColors.primary,
      iconBackgroundColor: const Color(0xFFE8F5E9),
      title: 'Your payment was confirmed',
      subtitle: 'Your pickup request has been sent to nearby collectors.',
      job: job,
      details: _buildDetailsCard(),
      primaryAction: _buildPrimaryAction(context),
      secondaryAction: _buildSecondaryAction(context),
    );
  }

  Widget _buildDetailsCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        children: [
          _buildDetailRow('Amount', '${job.quotedPrice?.toStringAsFixed(0) ?? '0'} XAF'),
          const Divider(height: 16, color: Color(0xFFE5E7EB)),
          _buildDetailRow('Payment Method', job.paymentMethodName ?? job.paymentMethod ?? 'Mobile Money'),
          const Divider(height: 16, color: Color(0xFFE5E7EB)),
          _buildDetailRowWithBadge(
            'Status', 
            'Verified',
            const Color(0xFFE8F5E9),
            AppColors.primary,
          ),
        ],
      ),
    );
  }

  Widget _buildPrimaryAction(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
        onPressed: () => _navigateToBookingDetails(context, job: job),
        child: const Text(
          'Track Pickup',
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }

  Widget _buildSecondaryAction(BuildContext context) {
    return TextButton(
      onPressed: () => _navigateHome(context),
      child: Text(
        'Back to Home',
        style: TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          color: Colors.grey.shade700,
        ),
      ),
    );
  }
}

/// Variant C: Failed/Rejected
class _FailedVariant extends StatelessWidget {
  final Job job;
  final String? reason;

  const _FailedVariant({required this.job, this.reason});

  @override
  Widget build(BuildContext context) {
    return _ResultScreenTemplate(
      icon: Icons.error_outline,
      iconColor: const Color(0xFFC62828),
      iconBackgroundColor: const Color(0xFFFFEBEE),
      title: 'Payment could not be verified',
      subtitle: reason ?? 'This may happen if the payment was cancelled, expired, or rejected.',
      job: job,
      details: _buildDetailsCard(),
      primaryAction: _buildPrimaryAction(context),
      secondaryAction: _buildSecondaryAction(context),
      extraActions: _buildExtraActions(context),
    );
  }

  Widget _buildDetailsCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        children: [
          _buildDetailRow('Amount', '${job.quotedPrice?.toStringAsFixed(0) ?? '0'} XAF'),
          const Divider(height: 16, color: Color(0xFFE5E7EB)),
          _buildDetailRow('Method', job.paymentMethodName ?? job.paymentMethod ?? 'Mobile Money'),
          const Divider(height: 16, color: Color(0xFFE5E7EB)),
          _buildDetailRowWithBadge(
            'Status', 
            'Failed',
            const Color(0xFFFFEBEE),
            const Color(0xFFC62828),
          ),
        ],
      ),
    );
  }

  Widget _buildPrimaryAction(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
        onPressed: () {
          // Navigate back to choose payment method
          Navigator.pushNamedAndRemoveUntil(
            context,
            '/choose-payment-method',
            (route) => route.settings.name == '/review-pickup',
          );
        },
        child: const Text(
          'Try Again',
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }

  Widget _buildSecondaryAction(BuildContext context) {
    return TextButton(
      onPressed: () => _navigateHome(context),
      child: Text(
        'Back to Home',
        style: TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          color: Colors.grey.shade700,
        ),
      ),
    );
  }

  Widget _buildExtraActions(BuildContext context) {
    return TextButton.icon(
      onPressed: () {
        // TODO: Navigate to support/contact
      },
      icon: const Icon(Icons.support_agent),
      label: const Text('Contact Support'),
    );
  }
}

/// Variant D: Cash (or Free Subscription)
class _CashVariant extends StatelessWidget {
  final Job job;
  final bool isFree;

  const _CashVariant({required this.job, this.isFree = false});

  @override
  Widget build(BuildContext context) {
    return _ResultScreenTemplate(
      icon: Icons.check_circle,
      iconColor: AppColors.primary,
      iconBackgroundColor: const Color(0xFFE8F5E9),
      title: isFree ? 'Pickup Scheduled!' : 'Your pickup request has been sent',
      subtitle: isFree 
          ? "We're finding a collector near you."
          : 'A collector will be assigned shortly.',
      job: job,
      details: _buildDetailsCard(),
      primaryAction: _buildPrimaryAction(context),
      secondaryAction: _buildSecondaryAction(context),
      timeline: PaymentTimeline.forJob(job),
    );
  }

  Widget _buildDetailsCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF8E1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFFA000)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  isFree ? Icons.check_circle : Icons.payments_outlined,
                  color: const Color(0xFFFFA000),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isFree ? 'Covered by Subscription' : 'Cash to Collector',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF111827),
                      ),
                    ),
                    if (!isFree) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Amount to prepare: ${job.quotedPrice?.toStringAsFixed(0) ?? '0'} XAF',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade700,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          if (!isFree) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, size: 18, color: Colors.grey.shade600),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Status: Pending collection',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPrimaryAction(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
        onPressed: () => _navigateToBookingDetails(context, job: job),
        child: Text(
          isFree ? 'Track Pickup' : 'Track Pickup',
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }

  Widget _buildSecondaryAction(BuildContext context) {
    return TextButton(
      onPressed: () => _navigateHome(context),
      child: Text(
        'Back to Home',
        style: TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          color: Colors.grey.shade700,
        ),
      ),
    );
  }
}

/// Common template for all result variants
class _ResultScreenTemplate extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color iconBackgroundColor;
  final String title;
  final String subtitle;
  final Job job;
  final Widget details;
  final Widget primaryAction;
  final Widget secondaryAction;
  final Widget? timeline;
  final Widget? extraActions;

  const _ResultScreenTemplate({
    required this.icon,
    required this.iconColor,
    required this.iconBackgroundColor,
    required this.title,
    required this.subtitle,
    required this.job,
    required this.details,
    required this.primaryAction,
    required this.secondaryAction,
    this.timeline,
    this.extraActions,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    const SizedBox(height: 40),
                    
                    // Icon
                    Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        color: iconBackgroundColor,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        icon,
                        size: 50,
                        color: iconColor,
                      ),
                    ),
                    const SizedBox(height: 32),
                    
                    // Title
                    Text(
                      title,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF111827),
                      ),
                    ),
                    const SizedBox(height: 12),
                    
                    // Subtitle
                    Text(
                      subtitle,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 15,
                        height: 1.5,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 32),
                    
                    // Details card
                    details,
                    
                    // Timeline (if provided)
                    if (timeline != null) ...[
                      const SizedBox(height: 32),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'What happens next',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Colors.grey.shade800,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      timeline!,
                    ],
                  ],
                ),
              ),
            ),
            
            // Bottom actions
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
              child: SafeArea(
                top: false,
                child: Column(
                  children: [
                    primaryAction,
                    const SizedBox(height: 12),
                    secondaryAction,
                    if (extraActions != null) ...[
                      const SizedBox(height: 8),
                      extraActions!,
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Helper widgets
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

Widget _buildDetailRowWithBadge(String label, String value, Color bgColor, Color textColor) {
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
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(4),
        ),
        child: Text(
          value,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: textColor,
          ),
        ),
      ),
    ],
  );
}

// ─── Subscription Result Variants ──────────────────────────────────────────

class _SubscriptionSubmittedVariant extends StatelessWidget {
  final UserSubscription? subscription;
  const _SubscriptionSubmittedVariant({this.subscription});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF8E1),
                  borderRadius: BorderRadius.circular(40),
                ),
                child: const Icon(Icons.schedule, size: 40, color: Color(0xFFFFA000)),
              ),
              const SizedBox(height: 24),
              const Text(
                'Subscription Payment Submitted',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF111827)),
              ),
              const SizedBox(height: 12),
              Text(
                'We received your payment details. An admin will verify your payment shortly. Your subscription will become active after verification.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Colors.grey.shade600, height: 1.5),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 52),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    elevation: 0,
                  ),
                  onPressed: () {
                    context.read<PaymentFlowProvider>().clearSubscriptionContext();
                    Navigator.pushNamedAndRemoveUntil(context, '/home', (_) => false);
                  },
                  child: const Text('Back to Home', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 52),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    side: BorderSide(color: AppColors.primary),
                  ),
                  onPressed: () {
                    context.read<PaymentFlowProvider>().clearSubscriptionContext();
                    Navigator.pushNamedAndRemoveUntil(context, '/review-pickup', (_) => false);
                  },
                  child: Text('Pay Once for Now', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.primary)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SubscriptionActivatedVariant extends StatelessWidget {
  final UserSubscription? subscription;
  const _SubscriptionActivatedVariant({this.subscription});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F5E9),
                  borderRadius: BorderRadius.circular(40),
                ),
                child: Icon(Icons.check_circle, size: 40, color: AppColors.primary),
              ),
              const SizedBox(height: 24),
              const Text(
                'Subscription Activated!',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF111827)),
              ),
              const SizedBox(height: 12),
              Text(
                'Your subscription is now active. You can now book covered pickups.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Colors.grey.shade600, height: 1.5),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 52),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    elevation: 0,
                  ),
                  onPressed: () {
                    context.read<PaymentFlowProvider>().clearSubscriptionContext();
                    Navigator.pushNamedAndRemoveUntil(context, '/review-pickup', (_) => false);
                  },
                  child: const Text('Continue Booking', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () {
                  context.read<PaymentFlowProvider>().clearSubscriptionContext();
                  Navigator.pushNamedAndRemoveUntil(context, '/home', (_) => false);
                },
                child: Text('Back to Home', style: TextStyle(fontSize: 14, color: Colors.grey.shade600)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SubscriptionFailedVariant extends StatelessWidget {
  final String? reason;
  const _SubscriptionFailedVariant({this.reason});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: const Color(0xFFFFEBEE),
                  borderRadius: BorderRadius.circular(40),
                ),
                child: const Icon(Icons.error_outline, size: 40, color: Color(0xFFC62828)),
              ),
              const SizedBox(height: 24),
              const Text(
                'Subscription Payment Issue',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF111827)),
              ),
              const SizedBox(height: 12),
              Text(
                reason != null
                    ? 'We could not verify your payment.\nReason: $reason'
                    : 'We could not verify your payment. Please try again or contact support.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Colors.grey.shade600, height: 1.5),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 52),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    elevation: 0,
                  ),
                  onPressed: () => Navigator.pushNamedAndRemoveUntil(
                    context, '/subscription-plans', (_) => false),
                  child: const Text('Try Again', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () {
                  context.read<PaymentFlowProvider>().clearSubscriptionContext();
                  Navigator.pushNamedAndRemoveUntil(context, '/review-pickup', (_) => false);
                },
                child: Text('Pay Once for Now', style: TextStyle(fontSize: 14, color: Colors.grey.shade600)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// Navigation helpers
void _navigateToBookingDetails(BuildContext context, {required Job job}) {
  Navigator.pushNamedAndRemoveUntil(
    context,
    '/booking-details',
    (route) => route.settings.name == '/home',
    arguments: job.id,
  );
}

void _navigateHome(BuildContext context) {
  Navigator.pushNamedAndRemoveUntil(
    context,
    '/home',
    (route) => false,
  );
}
