import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../models/earning.dart';
import '../../providers/collector_earnings_provider.dart';
import '../../widgets/app_card.dart';
import '../../widgets/section_header.dart';
import '../../widgets/error_banner.dart';

class CollectorEarningsScreen extends StatefulWidget {
  const CollectorEarningsScreen({super.key});

  @override
  State<CollectorEarningsScreen> createState() =>
      _CollectorEarningsScreenState();
}

class _CollectorEarningsScreenState extends State<CollectorEarningsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<CollectorEarningsProvider>();
      provider.loadQuickSummary();
      provider.loadDetailedEarnings();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CollectorEarningsProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text('Earnings', style: AppTypography.heading3),
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () async {
          await Future.wait([
            provider.loadQuickSummary(),
            provider.loadDetailedEarnings(),
          ]);
        },
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (provider.error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: ErrorBanner(
                  message: provider.error!,
                  onDismiss: provider.clearError,
                ),
              ),

            // Quick summary
            if (provider.quickSummary != null) ...[
              _QuickSummarySection(summary: provider.quickSummary!),
              const SizedBox(height: AppSpacing.lg),
            ],

            // Detailed summary
            if (provider.detailedSummary != null) ...[
              SectionHeader(
                title: 'Job Earnings',
                trailing: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.primarySurface,
                    borderRadius: AppRadius.badgeBorder,
                  ),
                  child: Text(
                    '${provider.detailedSummary!.jobCount} jobs',
                    style: AppTypography.caption.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),

              if (provider.detailedSummary!.earnings.isEmpty)
                AppCard(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    children: [
                      Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          color: AppColors.primarySurface,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Icon(
                          Icons.account_balance_wallet_outlined,
                          size: 32,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Text('No earnings yet', style: AppTypography.subtitle),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        'Complete jobs to start earning',
                        style: AppTypography.caption,
                      ),
                    ],
                  ),
                )
              else
                ...provider.detailedSummary!.earnings
                    .map((e) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _EarningCard(earning: e),
                        )),
            ],

            if (provider.isLoading && provider.quickSummary == null)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ─── Quick Summary ───────────────────────────────────────────────────────────

class _QuickSummarySection extends StatelessWidget {
  final EarningsQuickSummary summary;

  const _QuickSummarySection({required this.summary});

  @override
  Widget build(BuildContext context) {
    return AppCardPrimary(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Earnings Overview',
            style: AppTypography.caption.copyWith(
              color: Colors.white70,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${summary.allTime.toStringAsFixed(0)} XAF',
            style: AppTypography.heading1.copyWith(
              color: Colors.white,
              fontSize: 28,
            ),
          ),
          Text(
            'All Time',
            style: AppTypography.overline.copyWith(color: Colors.white54),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              _SummaryTile(label: 'Today', amount: summary.today),
              const SizedBox(width: 8),
              _SummaryTile(label: 'This Week', amount: summary.thisWeek),
              const SizedBox(width: 8),
              _SummaryTile(label: 'This Month', amount: summary.thisMonth),
            ],
          ),
        ],
      ),
    );
  }
}

class _SummaryTile extends StatelessWidget {
  final String label;
  final double amount;

  const _SummaryTile({required this.label, required this.amount});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Text(
              label,
              style: AppTypography.overline.copyWith(color: Colors.white60),
            ),
            const SizedBox(height: 4),
            Text(
              amount.toStringAsFixed(0),
              style: AppTypography.subtitle.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
            ),
            Text(
              'XAF',
              style: AppTypography.overline.copyWith(
                color: Colors.white54,
                fontSize: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Earning Card ────────────────────────────────────────────────────────────

class _EarningCard extends StatelessWidget {
  final Earning earning;

  const _EarningCard({required this.earning});

  @override
  Widget build(BuildContext context) {
    final statusColor = _earningStatusColor(earning.status);

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${earning.totalAmount.toStringAsFixed(0)} XAF',
                style: AppTypography.heading3,
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: AppRadius.badgeBorder,
                ),
                child: Text(
                  earning.status.name,
                  style: AppTypography.overline.copyWith(
                    color: statusColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _DetailChip(
                label: 'Base',
                value: '${earning.baseAmount.toStringAsFixed(0)} XAF',
              ),
              const SizedBox(width: 8),
              _DetailChip(
                label: 'Distance',
                value: '${earning.distanceAmount.toStringAsFixed(0)} XAF',
              ),
              if (earning.surgeMultiplier > 1.0) ...[
                const SizedBox(width: 8),
                _DetailChip(
                  label: 'Surge',
                  value: '×${earning.surgeMultiplier.toStringAsFixed(1)}',
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Job: ${earning.jobId.length > 8 ? '${earning.jobId.substring(0, 8)}...' : earning.jobId}',
            style: AppTypography.overline,
          ),
        ],
      ),
    );
  }

  Color _earningStatusColor(EarningStatus status) {
    switch (status) {
      case EarningStatus.PENDING:
        return AppColors.warning;
      case EarningStatus.CONFIRMED:
        return AppColors.success;
      case EarningStatus.PAID:
        return AppColors.info;
    }
  }
}

// ─── Detail Chip ─────────────────────────────────────────────────────────────

class _DetailChip extends StatelessWidget {
  final String label;
  final String value;

  const _DetailChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.inputFill,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        '$label: $value',
        style: AppTypography.overline.copyWith(
          color: AppColors.textPrimary,
        ),
      ),
    );
  }
}
