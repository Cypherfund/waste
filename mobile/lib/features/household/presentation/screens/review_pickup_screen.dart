import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../../config/app_theme.dart';
import '../../../../models/subscription.dart';
import '../../../../providers/subscription_provider.dart';
import '../../../../providers/job_provider.dart';
import '../../../../services/api/api_client.dart';
import '../../providers/payment_flow_provider.dart';
import '../../providers/payment_flow_enums.dart';
import '../widgets/status_badge.dart';

/// Screen 1: Review Pickup with pricing-first design
/// 
/// Three states:
/// - State A: Subscription Covered (amountDue === 0)
/// - State B: Subscription Exhausted (has subscription but no pickups left)
/// - State C: No Subscription (pay per pickup)
class ReviewPickupScreen extends StatefulWidget {
  final Map<String, dynamic> arguments;

  const ReviewPickupScreen({
    super.key,
    required this.arguments,
  });

  @override
  State<ReviewPickupScreen> createState() => _ReviewPickupScreenState();
}

class _ReviewPickupScreenState extends State<ReviewPickupScreen> {
  bool _isCreatingJob = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeFlow();
      // Listen for pricing loading to complete and sync to flow provider
      context.read<SubscriptionProvider>().addListener(_onPricingLoaded);
    });
  }

  @override
  void dispose() {
    // Safe remove — provider may already be gone if screen is popped
    try {
      context.read<SubscriptionProvider>().removeListener(_onPricingLoaded);
    } catch (_) {}
    super.dispose();
  }

  void _onPricingLoaded() {
    if (!mounted) return;
    final subProvider = context.read<SubscriptionProvider>();
    final flowProvider = context.read<PaymentFlowProvider>();
    if (subProvider.pricingQuote != null && flowProvider.pricingQuote == null) {
      flowProvider.setPricingQuote(subProvider.pricingQuote!);
    }
  }

  void _initializeFlow() {
    final flowProvider = context.read<PaymentFlowProvider>();
    final subProvider = context.read<SubscriptionProvider>();

    // Clear any previous context to prevent amounts persisting
    flowProvider.clearSubscriptionContext();
    flowProvider.clearCashOnFirstPickupContext();
    flowProvider.clearWalletTopUpContext();

    // Extract pickup details from arguments
    final scheduledDate = widget.arguments['scheduledDate'] as DateTime?;
    final scheduledTime = widget.arguments['scheduledTime'] as String? ?? '10:00 AM';
    final locationAddress = widget.arguments['locationAddress'] as String? ?? 'Unknown location';
    final locationArea = widget.arguments['locationArea'] as String?;
    final landmark = widget.arguments['landmark'] as String?;
    final locationLat = widget.arguments['locationLat'] as double?;
    final locationLng = widget.arguments['locationLng'] as double?;
    final pickupType = widget.arguments['pickupType'] as String? ?? 'oneTime';

    // Validate required fields
    if (scheduledDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invalid pickup date. Please restart booking.')),
      );
      Navigator.pop(context);
      return;
    }

    // Initialize flow provider
    flowProvider.initPickupDetails(
      scheduledDate: scheduledDate,
      scheduledTime: scheduledTime,
      locationAddress: locationAddress,
      locationArea: locationArea,
      landmark: landmark,
      locationLat: locationLat,
      locationLng: locationLng,
      pickupType: pickupType,
    );

    // Always fetch fresh pricing — stale quote from a previous booking would misrepresent remaining pickups
    subProvider.clearPricingQuote();
    subProvider.loadPricingQuote();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
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
          onPressed: _isCreatingJob ? null : () => Navigator.pop(context),
        ),
        title: const Text(
          'Review Pickup',
          style: TextStyle(
            color: Color(0xFF111827),
            fontSize: 13,
            fontWeight: FontWeight.w800,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            const Divider(height: 1, thickness: 1, color: Color(0xFFF0F2F0)),
            Expanded(
              child: Consumer2<PaymentFlowProvider, SubscriptionProvider>(
                builder: (context, flowProvider, subProvider, _) {
                  final quote = subProvider.pricingQuote;
                  final isLoading = subProvider.isPricingLoading;

                  return SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Pickup summary
                        _buildPickupSummary(flowProvider),
                        const SizedBox(height: 24),

                        // Pricing section — shows skeleton while loading, error if null, content otherwise
                        if (isLoading)
                          _buildPricingSkeletonSection()
                        else if (quote == null)
                          _buildPricingErrorState(subProvider)
                        else
                          _buildPricingSection(quote, subProvider),
                      ],
                    ),
                  );
                },
              ),
            ),
            _buildBottomButton(),
          ],
        ),
      ),
    );
  }

  Widget _buildPricingSkeletonSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SkeletonBox(width: 100, height: 14),
        const SizedBox(height: 12),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFFF3F4F6),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Column(
            children: [
              _SkeletonBox(width: double.infinity, height: 14),
              SizedBox(height: 12),
              _SkeletonBox(width: 120, height: 36),
              SizedBox(height: 12),
              _SkeletonBox(width: double.infinity, height: 12),
            ],
          ),
        ),
        const SizedBox(height: 16),
        const _SkeletonBox(width: double.infinity, height: 54),
        const SizedBox(height: 12),
        const _SkeletonBox(width: double.infinity, height: 54),
      ],
    );
  }

  Widget _buildPricingErrorState(SubscriptionProvider subProvider) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.wifi_off_rounded, size: 56, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            const Text(
              'Could not load pricing',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Color(0xFF374151)),
            ),
            const SizedBox(height: 8),
            Text(
              'Check your internet connection and try again.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => subProvider.loadPricingQuote(),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPickupSummary(PaymentFlowProvider flowProvider) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        children: [
          _buildInfoRow(
            icon: Icons.calendar_today_outlined,
            title: 'Date & Time',
            value: flowProvider.scheduledDate != null
                ? '${DateFormat('EEE, d MMM yyyy').format(flowProvider.scheduledDate!)}, ${flowProvider.scheduledTime}'
                : 'Not set',
          ),
          const Divider(height: 24, color: Color(0xFFE5E7EB)),
          _buildInfoRow(
            icon: Icons.location_on_outlined,
            title: 'Address',
            value: flowProvider.locationAddress ?? 'Unknown',
            subtitle: flowProvider.landmark,
          ),
          const Divider(height: 24, color: Color(0xFFE5E7EB)),
          _buildInfoRow(
            icon: Icons.delete_outline_rounded,
            title: 'Waste Type',
            value: 'General Waste',
          ),
          const Divider(height: 24, color: Color(0xFFE5E7EB)),
          _buildInfoRow(
            icon: Icons.local_shipping_outlined,
            title: 'Pickup Type',
            value: flowProvider.pickupType == 'monthly' ? 'Monthly Subscription' : 'One-time Pickup',
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String title,
    required String value,
    String? subtitle,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: const Color(0xFF6B7280)),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF6B7280),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF111827),
                ),
              ),
              if (subtitle != null && subtitle.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  'Near: $subtitle',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF9CA3AF),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPricingSection(PricingQuote quote, SubscriptionProvider subProvider) {
    // State A: Subscription Covered
    if (quote.isCoveredBySubscription) {
      return _buildSubscriptionCoveredState(quote);
    }

    // State B: Subscription Exhausted
    if (quote.planName != null && quote.remainingPickupsThisWeek == 0) {
      return _buildSubscriptionExhaustedState(quote, subProvider);
    }

    // State C: No Subscription / Pay Per Pickup
    return _buildNoSubscriptionState(quote, subProvider);
  }

  // State A: Subscription Covered
  Widget _buildSubscriptionCoveredState(PricingQuote quote) {
    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFFE8F5E9),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.primary),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.check_circle, color: AppColors.primary, size: 24),
                  const SizedBox(width: 8),
                  Text(
                    'Covered by your subscription',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                quote.planName ?? 'Active subscription',
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF374151),
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '0 XAF due today',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
                ),
              ),
              if (quote.remainingPickupsThisWeek != null) ...[
                const SizedBox(height: 12),
                Text(
                  '${quote.remainingPickupsThisWeek} pickups remaining this week',
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF6B7280),
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFF3F4F6),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Icon(Icons.info_outline, size: 18, color: Colors.grey.shade600),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'This pickup is included in your active subscription. No payment required today.',
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
    );
  }

  // State B: Subscription Exhausted
  Widget _buildSubscriptionExhaustedState(PricingQuote quote, SubscriptionProvider subProvider) {
    return Column(
      children: [
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
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.warning_amber_rounded, color: Color(0xFFFFA000), size: 24),
                  const SizedBox(width: 8),
                  Text(
                    'Weekly pickups used',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Colors.orange.shade800,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'You have used all pickups included in your ${quote.planName} this week',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF6B7280),
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFFFA000)),
                ),
                child: Column(
                  children: [
                    const Text(
                      'Extra pickup cost',
                      style: TextStyle(
                        fontSize: 13,
                        color: Color(0xFF6B7280),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${quote.quotedPrice.toStringAsFixed(0)} XAF',
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF111827),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        // Two action buttons
        SizedBox(
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
            onPressed: _isCreatingJob ? null : _proceedToPayment,
            child: Text(
              'Pay for Extra Pickup (${quote.quotedPrice.toStringAsFixed(0)} XAF)',
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: OutlinedButton(
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: Colors.grey.shade300),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            onPressed: _isCreatingJob ? null : () => _navigateToSubscriptionPlans(),
            child: Text(
              'Manage Subscription',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade700,
              ),
            ),
          ),
        ),
      ],
    );
  }

  // State C: No Subscription
  Widget _buildNoSubscriptionState(PricingQuote quote, SubscriptionProvider subProvider) {
    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE5E7EB)),
          ),
          child: Column(
            children: [
              const Text(
                'This pickup costs',
                style: TextStyle(
                  fontSize: 14,
                  color: Color(0xFF6B7280),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '${quote.quotedPrice.toStringAsFixed(0)} XAF',
                style: const TextStyle(
                  fontSize: 36,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF111827),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Pay once for this pickup or subscribe to save more',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey.shade600,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        // Two action buttons
        SizedBox(
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
            onPressed: _isCreatingJob ? null : () => _navigateToSubscriptionPlans(),
            child: Text(
              quote.subscriptionSavingsMessage != null
                  ? 'Subscribe & Save ${_extractSavingsAmount(quote.subscriptionSavingsMessage!)}'
                  : 'Subscribe & Save',
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          height: 54,
          child: OutlinedButton(
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: AppColors.primary),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            onPressed: _isCreatingJob ? null : _proceedToPayment,
            child: Text(
              'Pay Once (${quote.quotedPrice.toStringAsFixed(0)} XAF)',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: AppColors.primary,
              ),
            ),
          ),
        ),
        if (quote.subscriptionSavingsMessage != null) ...[
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFE8F5E9),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(Icons.savings_outlined, size: 20, color: AppColors.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    quote.subscriptionSavingsMessage!,
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.primary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildBottomButton() {
    return Consumer2<PaymentFlowProvider, SubscriptionProvider>(
      builder: (context, flowProvider, subProvider, _) {
        final quote = subProvider.pricingQuote;
        final isFree = quote?.isCoveredBySubscription ?? false;

        // Only show bottom button for free pickups (subscription covered)
        // For paid pickups, buttons are inline in the pricing section
        if (!isFree) return const SizedBox.shrink();

        return Container(
          width: double.infinity,
          color: Colors.white,
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          child: SafeArea(
            top: false,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                disabledBackgroundColor: AppColors.primary.withOpacity(0.5),
                elevation: 0,
                minimumSize: const Size(double.infinity, 54),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              onPressed: _isCreatingJob ? null : _createFreeBooking,
              child: _isCreatingJob
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        color: Colors.white,
                      ),
                    )
                  : const Text(
                      'Confirm Pickup',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
            ),
          ),
        );
      },
    );
  }

  void _proceedToPayment() {
    Navigator.pushNamed(context, '/choose-payment-method');
  }

  void _navigateToSubscriptionPlans() {
    Navigator.pushNamed(context, '/subscription-plans');
  }

  /// Extracts the savings amount string from a message like
  /// "Subscribe for 3,500 XAF/month — save up to 4,500 XAF/month"
  /// Returns e.g. "4,500 XAF" or falls back to the full message.
  String _extractSavingsAmount(String message) {
    final match = RegExp(r'save up to (.+?)(?:/month|$)', caseSensitive: false).firstMatch(message);
    if (match != null) return match.group(1)!.trim();
    return message;
  }

  Future<void> _createFreeBooking() async {
    setState(() => _isCreatingJob = true);

    try {
      final flowProvider = context.read<PaymentFlowProvider>();
      final jobProvider = context.read<JobProvider>();

      final job = await jobProvider.createJob(
        scheduledDate: flowProvider.scheduledDate!,
        scheduledTime: flowProvider.scheduledTime!,
        locationAddress: flowProvider.fullAddress,
        locationLat: flowProvider.locationLat,
        locationLng: flowProvider.locationLng,
        notes: 'Subscription covered pickup',
        paymentMode: null, // Free - no payment
        paymentMethod: null,
        paymentRef: null,
        paymentProofUrl: null,
      );

      if (job != null && mounted) {
        flowProvider.setCreatedJob(job);
        flowProvider.setResultType(PaymentResultType.cash); // Use cash variant for free bookings

        Navigator.pushNamedAndRemoveUntil(
          context,
          '/payment-result',
          (route) => route.settings.name == '/home',
          arguments: {
            'resultType': PaymentResultType.cash,
            'job': job,
            'isFree': true,
          },
        );
      }
    } catch (e) {
      if (mounted) {
        final msg = ApiClient.extractErrorMessage(e);
        // Show dialog for 409 conflict errors (e.g., duplicate job on same date)
        if (e.toString().contains('409') || msg.contains('already have an active job')) {
          showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
              title: const Text('Cannot Schedule Pickup'),
              content: Text(msg),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('OK'),
                ),
              ],
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(msg),
              backgroundColor: Colors.red.shade700,
              duration: const Duration(seconds: 5),
            ),
          );
        }
      }
    } finally {
      if (mounted) {
        setState(() => _isCreatingJob = false);
      }
    }
  }
}

class _SkeletonBox extends StatelessWidget {
  final double width;
  final double height;

  const _SkeletonBox({required this.width, required this.height});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width == double.infinity ? double.infinity : width,
      height: height,
      decoration: BoxDecoration(
        color: const Color(0xFFE5E7EB),
        borderRadius: BorderRadius.circular(6),
      ),
    );
  }
}
