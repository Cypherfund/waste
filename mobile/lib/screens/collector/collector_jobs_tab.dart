import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/collector_jobs_provider.dart';
import '../../models/job.dart';
import '../../widgets/app_card.dart';

class CollectorJobsTab extends StatefulWidget {
  const CollectorJobsTab({super.key});

  @override
  State<CollectorJobsTab> createState() => _CollectorJobsTabState();
}

class _CollectorJobsTabState extends State<CollectorJobsTab>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CollectorJobsProvider>().loadJobs(refresh: true);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CollectorJobsProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Text('Jobs / Queue', style: AppTypography.heading2),
            ),
            const SizedBox(height: 16),

            // Tab bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
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
                    Tab(text: 'Upcoming'),
                    Tab(text: 'Completed'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Tab content
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _UpcomingTab(provider: provider),
                  _CompletedTab(provider: provider),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _UpcomingTab extends StatelessWidget {
  final CollectorJobsProvider provider;

  const _UpcomingTab({required this.provider});

  @override
  Widget build(BuildContext context) {
    final currentJob = provider.inProgressJobs.isNotEmpty
        ? provider.inProgressJobs.first
        : null;
    final nextJobs = provider.assignedJobs;

    if (provider.isLoading && provider.jobs.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (currentJob == null && nextJobs.isEmpty) {
      return _buildEmpty();
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () => provider.loadJobs(refresh: true),
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        children: [
          // Current job
          if (currentJob != null) ...[
            Text(
              'Current Job',
              style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            _CurrentJobCard(job: currentJob),
            const SizedBox(height: 20),
          ],

          // Next jobs
          if (nextJobs.isNotEmpty) ...[
            Text(
              'Next Jobs',
              style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            ...nextJobs.map((job) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _NextJobCard(job: job),
                )),
          ],
        ],
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: AppColors.primarySurface,
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Icon(Icons.calendar_today_outlined,
                size: 36, color: AppColors.primary),
          ),
          const SizedBox(height: 16),
          Text('No upcoming jobs', style: AppTypography.subtitle),
          const SizedBox(height: 6),
          Text(
            'New jobs will appear here when assigned',
            style: AppTypography.caption,
          ),
        ],
      ),
    );
  }
}

class _CurrentJobCard extends StatelessWidget {
  final Job job;

  const _CurrentJobCard({required this.job});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: () => Navigator.pushNamed(
        context,
        '/collector-job-detail',
        arguments: job,
      ),
      border: Border.all(color: AppColors.primary, width: 1.5),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: AppColors.primarySurface,
            child: Text(
              (job.householdName ?? 'C')[0].toUpperCase(),
              style: AppTypography.subtitle.copyWith(color: AppColors.primary),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  job.householdName ?? 'Customer',
                  style: AppTypography.bodyMedium,
                ),
                Text(
                  job.locationAddress,
                  style: AppTypography.caption,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  '2.4 km • 8 min ETA',
                  style: AppTypography.overline.copyWith(color: AppColors.primary),
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, color: AppColors.textHint),
        ],
      ),
    );
  }
}

class _NextJobCard extends StatelessWidget {
  final Job job;

  const _NextJobCard({required this.job});

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
          CircleAvatar(
            radius: 20,
            backgroundColor: AppColors.primarySurface,
            child: Text(
              (job.householdName ?? 'C')[0].toUpperCase(),
              style: AppTypography.caption.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  job.householdName ?? job.locationAddress,
                  style: AppTypography.bodyMedium,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  '${job.scheduledTime} • 2.1 km',
                  style: AppTypography.caption,
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, color: AppColors.textHint, size: 20),
        ],
      ),
    );
  }
}

class _CompletedTab extends StatelessWidget {
  final CollectorJobsProvider provider;

  const _CompletedTab({required this.provider});

  @override
  Widget build(BuildContext context) {
    final completedJobs = provider.completedJobs;

    if (provider.isLoading && provider.jobs.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (completedJobs.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppColors.primarySurface,
                borderRadius: BorderRadius.circular(18),
              ),
              child: const Icon(Icons.check_circle_outline,
                  size: 36, color: AppColors.primary),
            ),
            const SizedBox(height: 16),
            Text('No completed jobs yet', style: AppTypography.subtitle),
            const SizedBox(height: 6),
            Text(
              'Completed jobs will show here',
              style: AppTypography.caption,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () => provider.loadJobs(refresh: true),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: completedJobs.length,
        itemBuilder: (context, index) {
          final job = completedJobs[index];
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: AppCard(
              onTap: () => Navigator.pushNamed(
                context,
                '/collector-job-detail',
                arguments: job,
              ),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.primarySurface,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.check_circle,
                        size: 20, color: AppColors.primary),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          job.householdName ?? job.locationAddress,
                          style: AppTypography.bodyMedium,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          '${job.scheduledDate} • ${job.scheduledTime}',
                          style: AppTypography.caption,
                        ),
                      ],
                    ),
                  ),
                  Text(
                    '+1,400 XAF',
                    style: AppTypography.bodyMedium.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
