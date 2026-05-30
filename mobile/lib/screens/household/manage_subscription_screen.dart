import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../models/subscription.dart';
import '../../providers/subscription_provider.dart';

String _subscriptionStatusToString(SubscriptionStatus status) {
  switch (status) {
    case SubscriptionStatus.ACTIVE:
      return 'ACTIVE';
    case SubscriptionStatus.EXPIRED:
      return 'EXPIRED';
    case SubscriptionStatus.CANCELLED:
      return 'CANCELLED';
    case SubscriptionStatus.PENDING_PAYMENT:
      return 'PENDING_PAYMENT';
    case SubscriptionStatus.PAYMENT_FAILED:
      return 'PAYMENT_FAILED';
  }
}

class ManageSubscriptionScreen extends StatefulWidget {
  const ManageSubscriptionScreen({super.key});

  @override
  State<ManageSubscriptionScreen> createState() =>
      _ManageSubscriptionScreenState();
}

class _ManageSubscriptionScreenState extends State<ManageSubscriptionScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SubscriptionProvider>().loadMySubscription();
    });
  }

  @override
  Widget build(BuildContext context) {
    final sub = context.watch<SubscriptionProvider>();
    final subscription = sub.subscription;

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
          'My Subscription',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w800,
            color: Color(0xFF111827),
          ),
        ),
        centerTitle: true,
      ),
      body: sub.isLoading
          ? const Center(child: CircularProgressIndicator())
          : subscription == null || !subscription.isActive
              ? _buildNoSubscription()
              : ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    _buildStatusCard(subscription),
                    const SizedBox(height: 16),
                    _buildPickupUsage(subscription),
                    const SizedBox(height: 24),
                    _buildCancelSection(sub),
                  ],
                ),
    );
  }

  Widget _buildNoSubscription() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.subscriptions_outlined,
                size: 64, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            const Text(
              'No active subscription',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: Color(0xFF111827),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Subscribe to save money on your pickups',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
            ),
            const SizedBox(height: 24),
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
                onPressed: () =>
                    Navigator.pushNamed(context, '/subscription-plans'),
                child: const Text(
                  'Subscribe Now',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusCard(subscription) {
    final plan = subscription.plan;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  plan?.name ?? 'Standard Plan',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF111827),
                  ),
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFEAF5EA),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  _subscriptionStatusToString(subscription.status),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _infoRow(
            'Price',
            plan != null
                ? '${plan.price.toStringAsFixed(0)} XAF / month'
                : '3,500 XAF / month',
          ),
          const SizedBox(height: 8),
          _infoRow('Start date', subscription.startDate),
          const SizedBox(height: 8),
          _infoRow('Next renewal', subscription.endDate),
          const SizedBox(height: 8),
          _infoRow(
            'Includes',
            '${plan?.pickupsPerWeek ?? 2} pickups per week',
          ),
        ],
      ),
    );
  }

  Widget _buildPickupUsage(subscription) {
    final remaining = subscription.remainingPickupsThisWeek is int
        ? subscription.remainingPickupsThisWeek as int
        : (subscription.remainingPickupsThisWeek ?? 0).toInt();
    final total = subscription.plan?.pickupsPerWeek ?? 2;
    final used = total - remaining;
    final resetDay = subscription.weekResetDate ?? 'Monday';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'This week',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: Color(0xFF111827),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _usageDot(
                  label: 'Used',
                  value: used,
                  color: const Color(0xFFE5E7EB),
                ),
              ),
              Expanded(
                child: _usageDot(
                  label: 'Remaining',
                  value: remaining,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              const Icon(Icons.refresh_rounded,
                  size: 14, color: Color(0xFF9CA3AF)),
              const SizedBox(width: 4),
              Text(
                'Resets every Monday · Next: $resetDay',
                style: const TextStyle(
                  fontSize: 11,
                  color: Color(0xFF9CA3AF),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _usageDot({
    required String label,
    required int value,
    required Color color,
  }) {
    return Column(
      children: [
        Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            shape: BoxShape.circle,
            border: Border.all(color: color, width: 2),
          ),
          child: Center(
            child: Text(
              '$value',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w900,
                color: color == const Color(0xFFE5E7EB)
                    ? const Color(0xFF9CA3AF)
                    : color,
              ),
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            color: Color(0xFF6B7280),
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildCancelSection(SubscriptionProvider sub) {
    return Column(
      children: [
        const Text(
          'Cancelling stops renewal but your benefits remain until the end of the current period.',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 11,
            color: Color(0xFF9CA3AF),
            height: 1.5,
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          height: 50,
          child: OutlinedButton(
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.red.shade600,
              side: BorderSide(color: Colors.red.shade300),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            onPressed: sub.isActing ? null : () => _confirmCancel(sub),
            child: sub.isActing
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text(
                    'Cancel Subscription',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
          ),
        ),
      ],
    );
  }

  Widget _infoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Color(0xFF6B7280),
            fontWeight: FontWeight.w500,
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: Color(0xFF111827),
          ),
        ),
      ],
    );
  }

  Future<void> _confirmCancel(SubscriptionProvider sub) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel subscription?'),
        content: const Text(
          'Your benefits continue until the end of this billing period. You can resubscribe any time.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Keep it'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Cancel subscription'),
          ),
        ],
      ),
    );
    if (confirm != true || !mounted) return;
    final ok = await sub.cancel();
    if (!mounted) return;
    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Subscription cancelled')),
      );
      Navigator.pop(context);
    } else if (sub.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(sub.error!),
            backgroundColor: Colors.red.shade600),
      );
    }
  }
}
