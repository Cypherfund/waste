import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/earning.dart';
import '../../providers/collector_earnings_provider.dart';
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
      appBar: AppBar(
        title: const Text('Earnings'),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await Future.wait([
            provider.loadQuickSummary(),
            provider.loadDetailedEarnings(),
          ]);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (provider.error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: ErrorBanner(
                  message: provider.error!,
                  onDismiss: provider.clearError,
                ),
              ),

            // Quick summary cards
            if (provider.quickSummary != null) ...[
              _QuickSummarySection(summary: provider.quickSummary!),
              const SizedBox(height: 20),
            ],

            // Detailed summary
            if (provider.detailedSummary != null) ...[
              _DetailedSummaryHeader(summary: provider.detailedSummary!),
              const SizedBox(height: 12),
              if (provider.detailedSummary!.earnings.isEmpty)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      children: [
                        Icon(Icons.account_balance_wallet_outlined,
                            size: 48, color: Colors.grey[400]),
                        const SizedBox(height: 8),
                        Text('No earnings yet',
                            style: TextStyle(color: Colors.grey[600])),
                      ],
                    ),
                  ),
                )
              else
                ...provider.detailedSummary!.earnings
                    .map((e) => _EarningCard(earning: e)),
            ],

            if (provider.isLoading &&
                provider.quickSummary == null)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: CircularProgressIndicator(),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _QuickSummarySection extends StatelessWidget {
  final EarningsQuickSummary summary;

  const _QuickSummarySection({required this.summary});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: const Color(0xFF2E7D32),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Earnings Overview',
              style: TextStyle(
                color: Colors.white70,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${summary.allTime.toStringAsFixed(0)} XAF',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 28,
                fontWeight: FontWeight.bold,
              ),
            ),
            const Text(
              'All Time',
              style: TextStyle(color: Colors.white54, fontSize: 12),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                _SummaryTile(label: 'Today', amount: summary.today),
                const SizedBox(width: 16),
                _SummaryTile(label: 'This Week', amount: summary.thisWeek),
                const SizedBox(width: 16),
                _SummaryTile(label: 'This Month', amount: summary.thisMonth),
              ],
            ),
          ],
        ),
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
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Text(label,
                style: const TextStyle(color: Colors.white60, fontSize: 11)),
            const SizedBox(height: 4),
            Text(
              amount.toStringAsFixed(0),
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
            const Text('XAF',
                style: TextStyle(color: Colors.white54, fontSize: 10)),
          ],
        ),
      ),
    );
  }
}

class _DetailedSummaryHeader extends StatelessWidget {
  final EarningsSummary summary;

  const _DetailedSummaryHeader({required this.summary});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Text(
          'Job Earnings',
          style: theme.textTheme.titleMedium
              ?.copyWith(fontWeight: FontWeight.bold),
        ),
        const Spacer(),
        Chip(
          label: Text(
            '${summary.jobCount} jobs',
            style: const TextStyle(fontSize: 12),
          ),
          visualDensity: VisualDensity.compact,
        ),
      ],
    );
  }
}

class _EarningCard extends StatelessWidget {
  final Earning earning;

  const _EarningCard({required this.earning});

  @override
  Widget build(BuildContext context) {
    final statusColor = _earningStatusColor(earning.status);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${earning.totalAmount.toStringAsFixed(0)} XAF',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    earning.status.name,
                    style: TextStyle(
                      color: statusColor,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
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
            const SizedBox(height: 6),
            Text(
              'Job: ${earning.jobId.length > 8 ? '${earning.jobId.substring(0, 8)}...' : earning.jobId}',
              style: TextStyle(color: Colors.grey[500], fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }

  Color _earningStatusColor(EarningStatus status) {
    switch (status) {
      case EarningStatus.PENDING:
        return Colors.orange;
      case EarningStatus.CONFIRMED:
        return Colors.green;
      case EarningStatus.PAID:
        return Colors.blue;
    }
  }
}

class _DetailChip extends StatelessWidget {
  final String label;
  final String value;

  const _DetailChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        '$label: $value',
        style: TextStyle(color: Colors.grey[700], fontSize: 11),
      ),
    );
  }
}
