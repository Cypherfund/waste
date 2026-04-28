import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../models/earning.dart';
import '../../providers/collector_earnings_provider.dart';
import '../../widgets/app_card.dart';

class CollectorEarningsTab extends StatefulWidget {
  const CollectorEarningsTab({super.key});

  @override
  State<CollectorEarningsTab> createState() => _CollectorEarningsTabState();
}

class _CollectorEarningsTabState extends State<CollectorEarningsTab>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<CollectorEarningsProvider>();
      provider.loadQuickSummary();
      provider.loadDetailedEarnings();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CollectorEarningsProvider>();
    final summary = provider.quickSummary;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async {
            await Future.wait([
              provider.loadQuickSummary(),
              provider.loadDetailedEarnings(),
            ]);
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            children: [
              // Title
              Text('Earnings', style: AppTypography.heading2),
              const SizedBox(height: 16),

              // Period tabs
              Container(
                decoration: BoxDecoration(
                  color: AppColors.inputFill,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: TabBar(
                  controller: _tabController,
                  indicator: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  indicatorSize: TabBarIndicatorSize.tab,
                  labelColor: Colors.white,
                  unselectedLabelColor: AppColors.textSecondary,
                  dividerColor: Colors.transparent,
                  splashBorderRadius: BorderRadius.circular(10),
                  padding: const EdgeInsets.all(4),
                  tabs: const [
                    Tab(text: 'Today'),
                    Tab(text: 'This Week'),
                    Tab(text: 'This Month'),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Earnings amount card
              AppCard(
                color: AppColors.primary,
                shadow: AppShadows.elevated,
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Today's Earnings",
                      style: AppTypography.caption.copyWith(color: Colors.white70),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${(summary?.today ?? 0).toStringAsFixed(0)} XAF',
                      style: AppTypography.heading1.copyWith(
                        color: Colors.white,
                        fontSize: 32,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Today Goal
              _buildGoalProgress(summary),
              const SizedBox(height: 20),

              // Summary section
              _buildSummarySection(summary),
              const SizedBox(height: 20),

              // Recent Transactions
              _buildRecentTransactions(provider),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGoalProgress(EarningsQuickSummary? summary) {
    final earned = summary?.today ?? 0;
    const goal = 10000.0;
    final progress = (earned / goal).clamp(0.0, 1.0);
    final percentage = (progress * 100).toInt();

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Today Goal',
                style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600),
              ),
              Text(
                '$percentage%',
                style: AppTypography.bodyMedium.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '${earned.toStringAsFixed(0)} XAF / ${goal.toStringAsFixed(0)} XAF',
            style: AppTypography.caption,
          ),
          const SizedBox(height: 10),
          Text(
            'Daily earnings goal',
            style: AppTypography.overline,
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              backgroundColor: AppColors.inputFill,
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummarySection(EarningsQuickSummary? summary) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Summary',
            style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 12),
          _buildSummaryRow('Jobs Completed', '3'),
          const Divider(height: 20, color: AppColors.divider),
          _buildSummaryRow('Total Earnings', '${(summary?.today ?? 0).toStringAsFixed(0)} XAF'),
          const Divider(height: 20, color: AppColors.divider),
          _buildSummaryRow('Cash Collected', '${(summary?.today ?? 0).toStringAsFixed(0)} XAF'),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: AppTypography.body),
        Text(
          value,
          style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600),
        ),
      ],
    );
  }

  Widget _buildRecentTransactions(CollectorEarningsProvider provider) {
    final earnings = provider.detailedSummary?.earnings ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Recent Transactions',
          style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 10),
        if (earnings.isEmpty)
          AppCard(
            padding: const EdgeInsets.all(24),
            child: Center(
              child: Text(
                'No transactions yet',
                style: AppTypography.caption,
              ),
            ),
          )
        else
          ...earnings.take(5).map((earning) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _TransactionCard(earning: earning),
              )),
        const SizedBox(height: 12),
        // Cashout button
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () => Navigator.pushNamed(context, '/collector-cashout'),
            icon: const Icon(Icons.account_balance_wallet_outlined, size: 18),
            label: const Text('Withdraw Earnings'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.primary,
              side: const BorderSide(color: AppColors.primary),
              minimumSize: const Size(double.infinity, 48),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _TransactionCard extends StatelessWidget {
  final Earning earning;

  const _TransactionCard({required this.earning});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.primarySurface,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.arrow_upward, size: 18, color: AppColors.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Job #${earning.jobId.length > 8 ? earning.jobId.substring(0, 8) : earning.jobId}',
                  style: AppTypography.bodyMedium,
                ),
                Text(
                  _formatDate(earning.createdAt),
                  style: AppTypography.caption,
                ),
              ],
            ),
          ),
          Text(
            '+${earning.totalAmount.toStringAsFixed(0)} XAF',
            style: AppTypography.bodyMedium.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}
