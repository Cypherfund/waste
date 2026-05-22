import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../models/earning.dart';
import '../../providers/collector_earnings_provider.dart';
import '../../widgets/app_card.dart';
import '../../widgets/stale_data_banner.dart';
import '../../widgets/skeleton_loader.dart';

class CollectorEarningsTab extends StatefulWidget {
  const CollectorEarningsTab({super.key});

  @override
  State<CollectorEarningsTab> createState() => CollectorEarningsTabState();
}

class CollectorEarningsTabState extends State<CollectorEarningsTab>
    with TickerProviderStateMixin {
  late TabController _tabController;
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;
  int _selectedPeriod = 0;

  static const _periodLabels = ['Today', 'This Week', 'This Month'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _fadeAnimation = CurvedAnimation(parent: _fadeController, curve: Curves.easeIn);
    _fadeController.forward();

    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) return;
      setState(() => _selectedPeriod = _tabController.index);
      _fadeController.forward(from: 0);
      _reloadForPeriod(_tabController.index);
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<CollectorEarningsProvider>();
      if (provider.isStale) {
        provider.loadQuickSummary();
        provider.loadWallet();
      }
      _reloadForPeriod(0);
    });
  }

  void reloadWallet() {
    context.read<CollectorEarningsProvider>().loadWallet();
  }

  void _reloadForPeriod(int index) {
    final now = DateTime.now();
    final provider = context.read<CollectorEarningsProvider>();
    DateTime from;
    switch (index) {
      case 1:
        from = now.subtract(Duration(days: now.weekday - 1));
        from = DateTime(from.year, from.month, from.day);
        break;
      case 2:
        from = DateTime(now.year, now.month, 1);
        break;
      default:
        from = DateTime(now.year, now.month, now.day);
    }
    final fromStr = from.toIso8601String().split('T').first;
    final toStr = now.toIso8601String().split('T').first;
    provider.loadDetailedEarnings(from: fromStr, to: toStr);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _fadeController.dispose();
    super.dispose();
  }

  double _periodEarnings(EarningsQuickSummary? s) {
    if (s == null) return 0;
    switch (_selectedPeriod) {
      case 1: return s.thisWeek;
      case 2: return s.thisMonth;
      default: return s.today;
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CollectorEarningsProvider>();
    final summary = provider.quickSummary;
    final walletBalance = provider.walletBalance;
    final periodEarnings = _periodEarnings(summary);
    final detailed = provider.detailedSummary;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // ── Sticky header ──────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Earnings', style: AppTypography.heading2),
                  const SizedBox(height: 14),

                  // Period tab selector
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
                  const SizedBox(height: 14),

                  // Earnings + balance card
                  AppCard(
                    color: AppColors.primary,
                    shadow: AppShadows.elevated,
                    padding: const EdgeInsets.all(20),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${_periodLabels[_selectedPeriod]}\'s Earnings',
                                style: AppTypography.caption.copyWith(color: Colors.white70),
                              ),
                              const SizedBox(height: 4),
                              AnimatedSwitcher(
                                duration: const Duration(milliseconds: 400),
                                transitionBuilder: (child, anim) => FadeTransition(
                                  opacity: anim,
                                  child: SlideTransition(
                                    position: Tween<Offset>(
                                      begin: const Offset(0, 0.3),
                                      end: Offset.zero,
                                    ).animate(anim),
                                    child: child,
                                  ),
                                ),
                                child: Text(
                                  '${periodEarnings.toStringAsFixed(0)} XAF',
                                  key: ValueKey('$_selectedPeriod-$periodEarnings'),
                                  style: AppTypography.heading1.copyWith(
                                    color: Colors.white,
                                    fontSize: 26,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(width: 1, height: 48, color: Colors.white24),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Wallet Balance',
                                style: AppTypography.caption.copyWith(color: Colors.white70),
                              ),
                              const SizedBox(height: 4),
                              AnimatedSwitcher(
                                duration: const Duration(milliseconds: 400),
                                transitionBuilder: (child, anim) => FadeTransition(
                                  opacity: anim,
                                  child: child,
                                ),
                                child: Text(
                                  '${walletBalance.toStringAsFixed(0)} XAF',
                                  key: ValueKey(walletBalance),
                                  style: AppTypography.heading1.copyWith(
                                    color: Colors.white,
                                    fontSize: 26,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Withdraw button below balance card
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => Navigator.pushNamed(context, '/collector-cashout'),
                      icon: const Icon(Icons.account_balance_wallet_outlined, size: 18),
                      label: const Text('Withdraw Earnings'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: const BorderSide(color: AppColors.primary),
                        minimumSize: const Size(double.infinity, 46),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),

                  // Pending payout notice
                  _PendingPayoutNotice(provider: provider),
                ],
              ),
            ),

            // ── Stale data banner ──────────────────────────────────
            StaleDataBanner(
              show: provider.refreshFailed,
              onRetry: () {
                provider.clearError();
                provider.loadQuickSummary();
                provider.loadDetailedEarnings();
                provider.loadWallet();
              },
            ),

            // ── Scrollable body ────────────────────────────────────
            Expanded(
              child: RefreshIndicator(
                color: AppColors.primary,
                onRefresh: () async {
                  provider.clearError();
                  await Future.wait([
                    provider.loadQuickSummary(),
                    provider.loadDetailedEarnings(),
                    provider.loadWallet(),
                  ]);
                },
                child: FadeTransition(
                  opacity: _fadeAnimation,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
                    children: [
                      // Goal progress
                      _buildGoalProgress(periodEarnings, _selectedPeriod),
                      const SizedBox(height: 16),

                      // Summary stats
                      _buildSummarySection(detailed, _selectedPeriod, periodEarnings),
                      const SizedBox(height: 16),

                      // Transactions
                      _buildRecentTransactions(provider),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGoalProgress(double earned, int period) {
    final goals = [10000.0, 50000.0, 150000.0];
    final goalLabels = ['Daily goal', 'Weekly goal', 'Monthly goal'];
    final goal = goals[period];
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
                goalLabels[period],
                style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600),
              ),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                child: Text(
                  '$percentage%',
                  key: ValueKey('$period-$percentage'),
                  style: AppTypography.bodyMedium.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w700,
                  ),
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
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: progress),
            duration: const Duration(milliseconds: 600),
            curve: Curves.easeOutCubic,
            builder: (context, value, _) => ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: value,
                minHeight: 8,
                backgroundColor: AppColors.inputFill,
                valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummarySection(EarningsSummary? detailed, int period, double periodEarnings) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Summary',
            style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 12),
          _buildSummaryRow('Jobs Completed', '${detailed?.jobCount ?? 0}'),
          const Divider(height: 20, color: AppColors.divider),
          _buildSummaryRow('Confirmed earnings', '${(detailed?.confirmedEarnings ?? 0).toStringAsFixed(0)} XAF'),
          const Divider(height: 20, color: AppColors.divider),
          _buildSummaryRow('Pending earnings', '${(detailed?.pendingEarnings ?? 0).toStringAsFixed(0)} XAF'),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: AppTypography.body),
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 300),
          child: Text(
            value,
            key: ValueKey(value),
            style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }

  Widget _buildRecentTransactions(CollectorEarningsProvider provider) {
    final earnings = provider.detailedSummary?.earnings ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Transactions',
              style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600),
            ),
            if (earnings.isNotEmpty)
              Text(
                '${earnings.length} jobs',
                style: AppTypography.caption.copyWith(color: AppColors.textSecondary),
              ),
          ],
        ),
        const SizedBox(height: 10),
        if (provider.isLoading)
          const JobListSkeleton(itemCount: 3)
        else if (earnings.isEmpty)
          AppCard(
            padding: const EdgeInsets.all(24),
            child: Center(
              child: Column(
                children: [
                  Icon(Icons.receipt_long_outlined, size: 36, color: AppColors.textSecondary),
                  const SizedBox(height: 8),
                  Text('No transactions for this period', style: AppTypography.caption),
                ],
              ),
            ),
          )
        else
          ...earnings.asMap().entries.map((entry) {
            final i = entry.key;
            final earning = entry.value;
            return TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: 1),
              duration: Duration(milliseconds: 250 + i * 60),
              curve: Curves.easeOut,
              builder: (context, v, child) => Opacity(
                opacity: v,
                child: Transform.translate(
                  offset: Offset(0, 16 * (1 - v)),
                  child: child,
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _TransactionCard(earning: earning),
              ),
            );
          }),
      ],
    );
  }
}

class _TransactionCard extends StatelessWidget {
  final Earning earning;

  const _TransactionCard({required this.earning});

  @override
  Widget build(BuildContext context) {
    final isConfirmed = earning.status == EarningStatus.CONFIRMED;
    return AppCard(
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: isConfirmed
                  ? AppColors.primarySurface
                  : const Color(0xFFFFF3E0),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              isConfirmed ? Icons.check_circle_outline : Icons.schedule,
              size: 18,
              color: isConfirmed ? AppColors.primary : Colors.orange,
            ),
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
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '+${earning.totalAmount.toStringAsFixed(0)} XAF',
                style: AppTypography.bodyMedium.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Container(
                margin: const EdgeInsets.only(top: 2),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: isConfirmed
                      ? AppColors.primarySurface
                      : const Color(0xFFFFF3E0),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  isConfirmed ? 'Confirmed' : 'Pending',
                  style: AppTypography.overline.copyWith(
                    color: isConfirmed ? AppColors.primary : Colors.orange,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}

class _PendingPayoutNotice extends StatelessWidget {
  final CollectorEarningsProvider provider;
  const _PendingPayoutNotice({required this.provider});

  @override
  Widget build(BuildContext context) {
    final pending = provider.payoutHistory
        .where((p) => p.status == 'PENDING' || p.status == 'APPROVED')
        .toList();

    if (pending.isEmpty) return const SizedBox.shrink();

    final total = pending.fold<double>(0, (sum, p) => sum + p.amount);
    final label = pending.length == 1
        ? '1 payout request pending'
        : '${pending.length} payout requests pending';

    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, '/collector-cashout'),
      child: Container(
        margin: const EdgeInsets.only(top: 10),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        decoration: BoxDecoration(
          color: const Color(0xFFFFFBEB),
          border: Border.all(color: const Color(0xFFFDE68A)),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          children: [
            const Icon(Icons.schedule_rounded, size: 16, color: Color(0xFFD97706)),
            const SizedBox(width: 8),
            Expanded(
              child: RichText(
                text: TextSpan(
                  style: AppTypography.caption.copyWith(color: const Color(0xFF92400E)),
                  children: [
                    TextSpan(text: label),
                    TextSpan(
                      text: ' · ${total.toStringAsFixed(0)} XAF',
                      style: AppTypography.caption.copyWith(
                        color: const Color(0xFF92400E),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const TextSpan(text: ' deducted from balance'),
                  ],
                ),
              ),
            ),
            const Icon(Icons.chevron_right_rounded, size: 16, color: Color(0xFFD97706)),
          ],
        ),
      ),
    );
  }
}
