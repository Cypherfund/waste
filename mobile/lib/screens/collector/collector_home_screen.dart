import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/collector_jobs_provider.dart';
import '../../providers/collector_earnings_provider.dart';
import '../../models/job.dart';
import '../../widgets/app_card.dart';
import '../../widgets/section_header.dart';
import '../../widgets/job_status_badge.dart';
import '../../widgets/sync_status_banner.dart';

class CollectorHomeScreen extends StatefulWidget {
  const CollectorHomeScreen({super.key});

  @override
  State<CollectorHomeScreen> createState() => _CollectorHomeScreenState();
}

class _CollectorHomeScreenState extends State<CollectorHomeScreen> {
  int _currentNavIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CollectorJobsProvider>().loadJobs(refresh: true);
      context.read<CollectorEarningsProvider>().loadQuickSummary();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final jobs = context.watch<CollectorJobsProvider>();
    final earnings = context.watch<CollectorEarningsProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          const SyncStatusBanner(),
          Expanded(
            child: RefreshIndicator(
              color: AppColors.primary,
              onRefresh: () async {
                await Future.wait([
                  jobs.loadJobs(refresh: true),
                  earnings.loadQuickSummary(),
                ]);
              },
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                children: [
                  SizedBox(height: MediaQuery.of(context).padding.top + 16),

                  // Greeting
                  _buildGreeting(auth),
                  const SizedBox(height: AppSpacing.lg),

                  // Earnings card
                  if (earnings.quickSummary != null) ...[
                    _EarningsSummaryCard(
                      today: earnings.quickSummary!.today,
                      thisWeek: earnings.quickSummary!.thisWeek,
                      thisMonth: earnings.quickSummary!.thisMonth,
                      onTap: () => Navigator.pushNamed(context, '/collector-earnings'),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                  ],

                  // Active jobs
                  SectionHeader(
                    title: 'Active Jobs',
                    actionLabel: 'View All',
                    onAction: () => Navigator.pushNamed(context, '/collector-jobs'),
                  ),
                  const SizedBox(height: AppSpacing.sm),

                  if (jobs.isLoading && jobs.jobs.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(32),
                      child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
                    )
                  else if (jobs.activeJobs.isEmpty)
                    _buildEmptyJobs()
                  else
                    ...jobs.activeJobs
                        .take(5)
                        .map((job) => Padding(
                              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                              child: _CollectorJobCard(job: job),
                            )),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: _buildBottomNav(context),
    );
  }

  Widget _buildGreeting(AuthProvider auth) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Good morning, ${auth.user?.name ?? 'Collector'} 👋',
                style: AppTypography.heading2,
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: AppColors.primaryLight,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Online',
                    style: AppTypography.caption.copyWith(color: AppColors.primaryLight),
                  ),
                ],
              ),
            ],
          ),
        ),
        GestureDetector(
          onTap: () => context.read<AuthProvider>().logout(),
          child: CircleAvatar(
            radius: 22,
            backgroundColor: AppColors.primarySurface,
            child: Text(
              (auth.user?.name ?? 'C')[0].toUpperCase(),
              style: AppTypography.subtitle.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyJobs() {
    return AppCard(
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
            child: const Icon(Icons.check_circle_outline, size: 32, color: AppColors.primary),
          ),
          const SizedBox(height: AppSpacing.md),
          Text('No active jobs', style: AppTypography.subtitle),
          const SizedBox(height: AppSpacing.xs),
          Text(
            "We'll notify you when a new job is assigned",
            style: AppTypography.caption,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildBottomNav(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        boxShadow: AppShadows.bottomBar,
      ),
      child: SafeArea(
        top: false,
        child: BottomNavigationBar(
          currentIndex: _currentNavIndex,
          onTap: (index) {
            setState(() => _currentNavIndex = index);
            switch (index) {
              case 0:
                break;
              case 1:
                Navigator.pushNamed(context, '/collector-jobs');
                break;
              case 2:
                Navigator.pushNamed(context, '/collector-earnings');
                break;
            }
          },
          backgroundColor: Colors.transparent,
          elevation: 0,
          selectedItemColor: AppColors.primary,
          unselectedItemColor: AppColors.textHint,
          type: BottomNavigationBarType.fixed,
          selectedFontSize: 12,
          unselectedFontSize: 12,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined),
              activeIcon: Icon(Icons.home),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.work_outline),
              activeIcon: Icon(Icons.work),
              label: 'Jobs',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.account_balance_wallet_outlined),
              activeIcon: Icon(Icons.account_balance_wallet),
              label: 'Earnings',
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Earnings Summary Card ───────────────────────────────────────────────────

class _EarningsSummaryCard extends StatelessWidget {
  final double today;
  final double thisWeek;
  final double thisMonth;
  final VoidCallback onTap;

  const _EarningsSummaryCard({
    required this.today,
    required this.thisWeek,
    required this.thisMonth,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return AppCardPrimary(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Today\'s Earnings',
                style: AppTypography.caption.copyWith(color: Colors.white70),
              ),
              const Icon(Icons.chevron_right, color: Colors.white54, size: 20),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '${today.toStringAsFixed(0)} XAF',
            style: AppTypography.heading1.copyWith(
              color: Colors.white,
              fontSize: 28,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              _EarningPill(label: 'Today', amount: today),
              const SizedBox(width: 8),
              _EarningPill(label: 'Week', amount: thisWeek),
              const SizedBox(width: 8),
              _EarningPill(label: 'Month', amount: thisMonth),
            ],
          ),
        ],
      ),
    );
  }
}

class _EarningPill extends StatelessWidget {
  final String label;
  final double amount;

  const _EarningPill({required this.label, required this.amount});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.15),
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
              style: AppTypography.overline.copyWith(color: Colors.white54, fontSize: 10),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Collector Job Card ──────────────────────────────────────────────────────

class _CollectorJobCard extends StatelessWidget {
  final Job job;

  const _CollectorJobCard({required this.job});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: () => Navigator.pushNamed(
        context,
        '/collector-job-detail',
        arguments: job,
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: _statusColor(job.status).withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              _statusIcon(job.status),
              color: _statusColor(job.status),
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  job.locationAddress,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.bodyMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  '${job.scheduledDate} • ${job.scheduledTime}',
                  style: AppTypography.caption,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          JobStatusBadge(status: job.status),
        ],
      ),
    );
  }

  Color _statusColor(JobStatus status) {
    switch (status) {
      case JobStatus.ASSIGNED:
        return AppColors.badgeAssigned;
      case JobStatus.IN_PROGRESS:
        return AppColors.badgeInProgress;
      case JobStatus.COMPLETED:
        return AppColors.badgeCompleted;
      default:
        return AppColors.textSecondary;
    }
  }

  IconData _statusIcon(JobStatus status) {
    switch (status) {
      case JobStatus.ASSIGNED:
        return Icons.assignment_outlined;
      case JobStatus.IN_PROGRESS:
        return Icons.directions_run;
      case JobStatus.COMPLETED:
        return Icons.check_circle_outline;
      default:
        return Icons.work_outline;
    }
  }
}
