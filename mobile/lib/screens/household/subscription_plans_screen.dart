import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/subscription_provider.dart';
import '../../models/subscription.dart';
import '../../features/household/providers/payment_flow_provider.dart';
import '../../widgets/skeleton_loader.dart';

class SubscriptionPlansScreen extends StatefulWidget {
  const SubscriptionPlansScreen({super.key});

  @override
  State<SubscriptionPlansScreen> createState() =>
      _SubscriptionPlansScreenState();
}

class _SubscriptionPlansScreenState extends State<SubscriptionPlansScreen> {
  bool _isCashOnFirstPickup = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final sub = context.read<SubscriptionProvider>();
      sub.loadPlans();
      if (sub.pricingQuote == null) sub.loadPricingQuote();

      // Check if opened with cash on first pickup flag
      final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
      if (args != null && args['cashOnFirstPickup'] == true) {
        setState(() {
          _isCashOnFirstPickup = true;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final sub = context.watch<SubscriptionProvider>();
    final perPickup = sub.pricingQuote?.perPickupPrice ?? 1000;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAF8),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leadingWidth: 44,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              size: 16, color: Color(0xFF111827)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Choose how to pay',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w800,
            color: Color(0xFF111827),
          ),
        ),
        centerTitle: true,
      ),
      body: sub.isLoading
          ? _buildSkeletonLoader()
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
              children: [
                // Plans
                ...sub.plans.map((plan) => _buildPlanCard(plan, perPickup)),

                if (sub.plans.isEmpty && sub.error != null)
                  _buildPlansError(sub),

                if (sub.plans.isEmpty && sub.error == null && !sub.isLoading)
                  _buildPlansError(sub),

                const SizedBox(height: 20),
                const _Divider(),
                const SizedBox(height: 20),

                // Pay per pickup option
                _buildPayPerPickupCard(perPickup),

                const SizedBox(height: 24),
                _buildSavingsRow(perPickup),
              ],
            ),
    );
  }

  Widget _buildPlanCard(SubscriptionPlan plan, double perPickup) {
    final sub = context.read<SubscriptionProvider>();
    final monthlyPickups = plan.pickupsPerWeek * 4;
    final savings = (monthlyPickups * perPickup) - plan.price;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.primary, width: 2),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Recommended badge
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(12)),
            ),
            child: const Text(
              'RECOMMENDED',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: Colors.white,
                letterSpacing: 0.8,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      plan.name,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF111827),
                      ),
                    ),
                    const Spacer(),
                    RichText(
                      text: TextSpan(
                        children: [
                          TextSpan(
                            text: plan.price.toStringAsFixed(0),
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                              color: AppColors.primary,
                            ),
                          ),
                          const TextSpan(
                            text: ' XAF/mo',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                _checkRow('${plan.pickupsPerWeek} pickups every week'),
                const SizedBox(height: 6),
                _checkRow('Priority scheduling'),
                const SizedBox(height: 6),
                if (savings > 0)
                  _checkRow(
                    'Save up to ${savings.toStringAsFixed(0)} XAF/month',
                    highlight: true,
                  ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    onPressed: sub.isActing || plan.id.isEmpty
                        ? null
                        : () => _subscribe(plan),
                    child: sub.isActing
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            'Subscribe Now',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                  ),
                ),
                const SizedBox(height: 10),
                const Center(
                  child: Text(
                    'Cancel anytime · No hidden fees',
                    style: TextStyle(
                      fontSize: 10,
                      color: Color(0xFF9CA3AF),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _checkRow(String text, {bool highlight = false}) {
    return Row(
      children: [
        Icon(
          Icons.check_circle_rounded,
          size: 16,
          color: highlight ? AppColors.primary : const Color(0xFF6B7280),
        ),
        const SizedBox(width: 8),
        Text(
          text,
          style: TextStyle(
            fontSize: 12,
            fontWeight: highlight ? FontWeight.w700 : FontWeight.w500,
            color: highlight ? AppColors.primary : const Color(0xFF374151),
          ),
        ),
      ],
    );
  }

  Widget _buildPayPerPickupCard(double price) {
    return GestureDetector(
      onTap: () => Navigator.pop(context),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Pay per pickup',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF111827),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${price.toStringAsFixed(0)} XAF / pickup',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'No commitment',
                    style: TextStyle(
                      fontSize: 11,
                      color: Color(0xFF9CA3AF),
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded,
                color: Color(0xFF9CA3AF), size: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildSavingsRow(double perPickup) {
    const monthlyPickups = 8;
    final payAsYouGo = monthlyPickups * perPickup;
    const planPrice = 3500;
    final savings = payAsYouGo - planPrice;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFEAF5EA),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          const Icon(Icons.savings_outlined,
              color: Color(0xFF2E7D32), size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Pay per pickup: ${perPickup.toStringAsFixed(0)} XAF × $monthlyPickups/mo = ${payAsYouGo.toStringAsFixed(0)} XAF\n'
              'Subscribe: $planPrice XAF/mo  →  Save ${savings.toStringAsFixed(0)} XAF/month',
              style: const TextStyle(
                fontSize: 11,
                color: Color(0xFF1B5E20),
                fontWeight: FontWeight.w600,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _subscribe(SubscriptionPlan plan) {
    final flowProvider = context.read<PaymentFlowProvider>();

    if (_isCashOnFirstPickup) {
      // Cash on First Pickup flow
      flowProvider.setCashOnFirstPickupContext(
        plan.id,
        planPrice: plan.price.toDouble(),
      );
      Navigator.pushNamed(
        context,
        '/choose-payment-method',
        arguments: {
          'cashOnFirstPickup': true,
          'subtitle': 'for ${plan.name} subscription',
        },
      );
    } else {
      // Normal subscription flow
      flowProvider.clearWalletTopUpContext(); // Clear any previous top-up context
      flowProvider.setSubscriptionContext(
        plan.id,
        planPrice: plan.price.toDouble(),
      );
      Navigator.pushNamed(
        context,
        '/choose-payment-method',
        arguments: {
          'subtitle': 'for ${plan.name} subscription',
        },
      );
    }
  }

  Widget _buildPlansError(SubscriptionProvider sub) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF8E1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFFA000)),
      ),
      child: Column(
        children: [
          const Icon(Icons.wifi_off_rounded, color: Color(0xFFFFA000), size: 32),
          const SizedBox(height: 12),
          const Text(
            'Could not load plans',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: Color(0xFF111827),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            sub.error ?? 'Check your connection and try again.',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
          ),
          const SizedBox(height: 14),
          SizedBox(
            height: 40,
            child: ElevatedButton(
              onPressed: () => sub.loadPlans(),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFFA000),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text('Retry',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSkeletonLoader() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
      children: [
        // Skeleton plan cards
        _buildSkeletonPlanCard(),
        _buildSkeletonPlanCard(),
        const SizedBox(height: 20),
        const _Divider(),
        const SizedBox(height: 20),
        _buildSkeletonPayPerPickupCard(),
        const SizedBox(height: 24),
        _buildSkeletonSavingsRow(),
      ],
    );
  }

  Widget _buildSkeletonPlanCard() {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      height: 120,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SkeletonLoader(width: 120, height: 20, borderRadius: BorderRadius.circular(4)),
            const SizedBox(height: 8),
            SkeletonLoader(width: 80, height: 16, borderRadius: BorderRadius.circular(4)),
            const Spacer(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                SkeletonLoader(width: 60, height: 24, borderRadius: BorderRadius.circular(12)),
                SkeletonLoader(width: 100, height: 32, borderRadius: BorderRadius.circular(16)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSkeletonPayPerPickupCard() {
    return Container(
      height: 80,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SkeletonLoader(width: 100, height: 16, borderRadius: BorderRadius.circular(4)),
                const SizedBox(height: 4),
                SkeletonLoader(width: 80, height: 14, borderRadius: BorderRadius.circular(4)),
              ],
            ),
            SkeletonLoader(width: 80, height: 28, borderRadius: BorderRadius.circular(14)),
          ],
        ),
      ),
    );
  }

  Widget _buildSkeletonSavingsRow() {
    return Container(
      height: 60,
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            SkeletonLoader(width: 150, height: 16, borderRadius: BorderRadius.circular(4)),
            const Spacer(),
            SkeletonLoader(width: 80, height: 20, borderRadius: BorderRadius.circular(4)),
          ],
        ),
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  const _Divider();
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Expanded(child: Divider(color: Color(0xFFE5E7EB))),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(
            'or',
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey.shade500,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        const Expanded(child: Divider(color: Color(0xFFE5E7EB))),
      ],
    );
  }
}

