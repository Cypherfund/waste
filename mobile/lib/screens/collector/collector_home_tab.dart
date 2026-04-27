import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/collector_jobs_provider.dart';
import '../../providers/collector_earnings_provider.dart';
import '../../models/job.dart';

class CollectorHomeTab extends StatefulWidget {
  const CollectorHomeTab({super.key});

  @override
  State<CollectorHomeTab> createState() => _CollectorHomeTabState();
}

class _CollectorHomeTabState extends State<CollectorHomeTab> {
  bool _isOnline = true;

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

    final activeJob =
        jobs.inProgressJobs.isNotEmpty ? jobs.inProgressJobs.first : null;

    final assignedJob =
        jobs.assignedJobs.isNotEmpty ? jobs.assignedJobs.first : null;

    final hasNewJob = assignedJob != null && activeJob == null;
    final hasActiveJob = activeJob != null;
    final isWaiting = activeJob == null && assignedJob == null;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async {
            await Future.wait([
              jobs.loadJobs(refresh: true),
              earnings.loadQuickSummary(),
            ]);
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
            children: [
              _buildGreeting(auth),

              const SizedBox(height: 10),

              _buildOnlineChip(),

              if (isWaiting) ...[
                const SizedBox(height: 16),
                _buildReadyText(),
                const SizedBox(height: 16),
                _buildTodayOverview(earnings),
                const SizedBox(height: 14),
                _buildNoActiveJobCard(),
                const SizedBox(height: 14),
                _buildTodayGoalCard(),
              ],

              if (hasNewJob) ...[
                const SizedBox(height: 16),
                _buildNewJobAssigned(assignedJob, jobs),
                const SizedBox(height: 16),
                _buildTodayOverview(earnings),
                const SizedBox(height: 14),
                _buildTodayGoalCard(),
              ],

              if (hasActiveJob) ...[
                const SizedBox(height: 16),
                _buildActiveJobCard(activeJob),
                const SizedBox(height: 16),
                _buildTodayOverview(earnings),
                const SizedBox(height: 14),
                _buildNextJobCard(jobs, activeJob),
                const SizedBox(height: 14),
                _buildTodayGoalCard(),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGreeting(AuthProvider auth) {
    final name = auth.user?.name.split(' ').first ?? 'Jean';

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Text(
            'Good morning, $name 👋',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 15,
              height: 1.25,
              fontWeight: FontWeight.w900,
              color: Color(0xFF111827),
              letterSpacing: -0.2,
            ),
          ),
        ),
        IconButton(
          visualDensity: VisualDensity.compact,
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(
            minWidth: 36,
            minHeight: 36,
          ),
          onPressed: () {},
          icon: const Icon(
            Icons.notifications_none_rounded,
            size: 20,
            color: Color(0xFF111827),
          ),
        ),
      ],
    );
  }

  Widget _buildOnlineChip() {
    return GestureDetector(
      onTap: () {
        setState(() {
          _isOnline = !_isOnline;
        });
      },
      child: Align(
        alignment: Alignment.centerLeft,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
          decoration: BoxDecoration(
            color: _isOnline
                ? const Color(0xFFEAF7EA)
                : const Color(0xFFF3F4F6),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 7,
                height: 7,
                decoration: BoxDecoration(
                  color: _isOnline
                      ? AppColors.primary
                      : const Color(0xFF9CA3AF),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                _isOnline ? 'Online' : 'Offline',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: _isOnline
                      ? AppColors.primary
                      : const Color(0xFF9CA3AF),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildReadyText() {
    return const Text(
      "You're online and ready\nto receive jobs.",
      style: TextStyle(
        fontSize: 12,
        height: 1.35,
        fontWeight: FontWeight.w500,
        color: Color(0xFF374151),
      ),
    );
  }

  Widget _buildTodayOverview(CollectorEarningsProvider earnings) {
    final summary = earnings.quickSummary;
    final todayEarnings = (summary?.today ?? 0).toStringAsFixed(0);

    return _card(
      radius: 12,
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Today Overview',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w900,
              color: Color(0xFF111827),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _overviewTile(
                  icon: Icons.account_balance_wallet_outlined,
                  title: 'Earnings',
                  value: '$todayEarnings XAF',
                ),
              ),
              const SizedBox(width: 9),
              Expanded(
                child: _overviewTile(
                  icon: Icons.check_circle_outline_rounded,
                  title: 'Jobs Completed',
                  value: '3',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _overviewTile({
    required IconData icon,
    required String title,
    required String value,
  }) {
    return Container(
      padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
      decoration: BoxDecoration(
        color: const Color(0xFFF3FAF3),
        borderRadius: BorderRadius.circular(9),
        border: Border.all(color: const Color(0xFFE0EEE0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            size: 18,
            color: AppColors.primary,
          ),
          const SizedBox(height: 9),
          Text(
            title,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: Color(0xFF6B7280),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w900,
              color: AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNoActiveJobCard() {
    return _card(
      radius: 12,
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'No active job',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  "We'll notify you when a\nnew job is assigned.",
                  style: TextStyle(
                    fontSize: 11,
                    height: 1.35,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF6B7280),
                  ),
                ),
              ],
            ),
          ),
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: const Color(0xFFEAF7EA),
              borderRadius: BorderRadius.circular(11),
            ),
            child: Icon(
              Icons.notifications_active_rounded,
              color: AppColors.primary,
              size: 23,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTodayGoalCard() {
    return _card(
      radius: 12,
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
      child: Row(
        children: [
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Today Goal',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF111827),
                  ),
                ),
                SizedBox(height: 9),
                Text(
                  '10,000 XAF',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF2E7D32),
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Daily earnings goal',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF6B7280),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(
            width: 54,
            height: 54,
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 54,
                  height: 54,
                  child: CircularProgressIndicator(
                    value: 0.86,
                    strokeWidth: 5,
                    backgroundColor: const Color(0xFFE5E7EB),
                    valueColor: AlwaysStoppedAnimation<Color>(
                      AppColors.primary,
                    ),
                    strokeCap: StrokeCap.round,
                  ),
                ),
                const Text(
                  '86%',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF111827),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveJobCard(Job job) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.20),
            blurRadius: 16,
            offset: const Offset(0, 7),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _greenCardPill(
                label: 'ACTIVE JOB',
                light: true,
              ),
              const Spacer(),
              _greenCardPill(
                label: '8 min eta',
                light: true,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            job.householdName ?? 'Marie Claire',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            job.locationAddress,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: Colors.white70,
            ),
          ),
          const SizedBox(height: 5),
          const Text(
            '2.4 km away • 8 min ETA',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w500,
              color: Colors.white70,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 38,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pushNamed(
                  context,
                  '/collector-job-detail',
                  arguments: job,
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppColors.primary,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.navigation_rounded, size: 16),
                  SizedBox(width: 7),
                  Text(
                    'Navigate',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNewJobAssigned(
      Job job,
      CollectorJobsProvider provider,
      ) {
    return Column(
      children: [
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: const Color(0xFFEF4444),
              width: 1.1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
                decoration: const BoxDecoration(
                  color: Color(0xFFFFF7F7),
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(9),
                    topRight: Radius.circular(9),
                  ),
                ),
                child: Row(
                  children: [
                    _redPill('NEW JOB ASSIGNED'),
                    const Spacer(),
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'Respond within',
                          style: TextStyle(
                            fontSize: 7,
                            height: 1,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFFEF4444),
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          '00:25',
                          style: TextStyle(
                            fontSize: 14,
                            height: 1,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFFEF4444),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 8, 10),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: const Color(0xFFF1F1F1),
                      width: 1,
                    ),
                  ),
                child: Column(
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 26,
                          height: 26,
                          decoration: const BoxDecoration(
                            color: Color(0xFFFFE4E4),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.person_rounded,
                            size: 16,
                            color: Color(0xFFEF4444),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                job.householdName ?? 'Marie Claire',
                                style: const TextStyle(
                                  fontSize: 11,
                                  height: 1.15,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFF111827),
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                job.locationAddress,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 9,
                                  height: 1.2,
                                  fontWeight: FontWeight.w500,
                                  color: Color(0xFF6B7280),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 10),

                    const Divider(
                      height: 1,
                      thickness: 1,
                      color: Color(0xFFE5E7EB),
                    ),

                    const SizedBox(height: 10),

                    _jobInfoLineCompact(
                      Icons.delete_outline_rounded,
                      'Waste Type',
                      'Household Waste',
                    ),
                    _jobInfoLineCompact(
                      Icons.trending_up_rounded,
                      'Distance',
                      '2.4 km',
                    ),
                    _jobInfoLineCompact(
                      Icons.account_balance_wallet_outlined,
                      'Earnings',
                      '1,400 XAF',
                    ),
                    _jobInfoLineCompact(
                      Icons.access_time_rounded,
                      'Time Window',
                      job.scheduledTime,
                    ),
                  ],
                ),
              ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 10),

        Row(
          children: [
            Expanded(
              child: SizedBox(
                height: 34,
                child: OutlinedButton(
                  onPressed: provider.isActioning
                      ? null
                      : () => _handleRejectJob(provider, job.id),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFEF4444),
                    side: const BorderSide(
                      color: Color(0xFFEF4444),
                      width: 1,
                    ),
                    padding: EdgeInsets.zero,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(7),
                    ),
                  ),
                  child: const Text(
                    'Reject',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: SizedBox(
                height: 34,
                child: ElevatedButton(
                  onPressed: provider.isActioning
                      ? null
                      : () => _handleAcceptJob(provider, job),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: EdgeInsets.zero,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(7),
                    ),
                  ),
                  child: const Text(
                    'Accept',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _jobInfoLineCompact(
      IconData icon,
      String label,
      String value,
      ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 9),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            size: 13,
            color: AppColors.primary,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 9,
                    height: 1.15,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF111827),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 9,
                    height: 1.15,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF374151),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNextJobCard(CollectorJobsProvider jobs, Job activeJob) {
    final nextJobs =
        jobs.assignedJobs.where((job) => job.id != activeJob.id).toList();

    if (nextJobs.isEmpty) return const SizedBox.shrink();

    final job = nextJobs.first;

    return _card(
      radius: 12,
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
      child: Row(
        children: [
          Icon(
            Icons.location_on_outlined,
            color: AppColors.primary,
            size: 17,
          ),
          const SizedBox(width: 9),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Next Job (after this)',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF111827),
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  job.locationAddress,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF6B7280),
                  ),
                ),
                const SizedBox(height: 3),
                const Text(
                  '10:30 AM • 3.1 km',
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF9CA3AF),
                  ),
                ),
              ],
            ),
          ),
          Text(
            'View',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              color: AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _jobInfoLine(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(
            icon,
            size: 15,
            color: AppColors.primary,
          ),
          const SizedBox(width: 9),
          Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: Color(0xFF111827),
            ),
          ),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: Color(0xFF111827),
            ),
          ),
        ],
      ),
    );
  }

  Widget _greenCardPill({
    required String label,
    bool light = false,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
      decoration: BoxDecoration(
        color: light
            ? Colors.white.withValues(alpha: 0.18)
            : const Color(0xFFEAF7EA),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 8,
          fontWeight: FontWeight.w900,
          color: light ? Colors.white : AppColors.primary,
        ),
      ),
    );
  }

  Widget _redPill(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFFFE8E8),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.notifications_active_rounded,
            size: 12,
            color: Color(0xFFEF4444),
          ),
          const SizedBox(width: 5),
          Text(
            label,
            style: const TextStyle(
              fontSize: 8,
              fontWeight: FontWeight.w900,
              color: Color(0xFFEF4444),
            ),
          ),
        ],
      ),
    );
  }

  Widget _card({
    required Widget child,
    EdgeInsets padding = const EdgeInsets.all(12),
    double radius = 12,
  }) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: const Color(0xFFE5E7EB)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.025),
            blurRadius: 12,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: child,
    );
  }

  Future<void> _handleAcceptJob(
    CollectorJobsProvider provider,
    Job job,
  ) async {
    final accepted = await provider.acceptJob(job.id);

    if (accepted && mounted) {
      final started = await provider.startJob(job.id);

      if (started && mounted) {
        Navigator.pushNamed(
          context,
          '/collector-job-detail',
          arguments: job,
        );
      }
    }
  }

  Future<void> _handleRejectJob(
    CollectorJobsProvider provider,
    String jobId,
  ) async {
    await provider.rejectJob(jobId);
  }
}