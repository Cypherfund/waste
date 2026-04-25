import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/collector_jobs_provider.dart';
import '../../models/job.dart';
import '../../widgets/app_card.dart';
import '../../widgets/job_status_badge.dart';

class CollectorJobsListScreen extends StatefulWidget {
  const CollectorJobsListScreen({super.key});

  @override
  State<CollectorJobsListScreen> createState() =>
      _CollectorJobsListScreenState();
}

class _CollectorJobsListScreenState extends State<CollectorJobsListScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
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
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text('My Jobs', style: AppTypography.heading3),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 20),
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
                Tab(text: 'Assigned'),
                Tab(text: 'In Progress'),
                Tab(text: 'Completed'),
              ],
            ),
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _JobTab(
            jobs: provider.assignedJobs,
            isLoading: provider.isLoading,
            emptyMessage: 'No assigned jobs',
            emptySubtitle: 'New jobs will appear here when assigned',
            emptyIcon: Icons.assignment_outlined,
            onRefresh: () => provider.loadJobs(refresh: true),
          ),
          _JobTab(
            jobs: provider.inProgressJobs,
            isLoading: provider.isLoading,
            emptyMessage: 'No jobs in progress',
            emptySubtitle: 'Start an assigned job to see it here',
            emptyIcon: Icons.directions_run,
            onRefresh: () => provider.loadJobs(refresh: true),
          ),
          _JobTab(
            jobs: provider.completedJobs,
            isLoading: provider.isLoading,
            emptyMessage: 'No completed jobs',
            emptySubtitle: 'Completed jobs will show here',
            emptyIcon: Icons.check_circle_outline,
            onRefresh: () => provider.loadJobs(refresh: true),
          ),
        ],
      ),
    );
  }
}

class _JobTab extends StatelessWidget {
  final List<Job> jobs;
  final bool isLoading;
  final String emptyMessage;
  final String emptySubtitle;
  final IconData emptyIcon;
  final Future<void> Function() onRefresh;

  const _JobTab({
    required this.jobs,
    required this.isLoading,
    required this.emptyMessage,
    required this.emptySubtitle,
    required this.emptyIcon,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading && jobs.isEmpty) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }

    if (jobs.isEmpty) {
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
              child: Icon(emptyIcon, size: 36, color: AppColors.primary),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(emptyMessage, style: AppTypography.subtitle),
            const SizedBox(height: AppSpacing.xs),
            Text(emptySubtitle, style: AppTypography.caption),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: onRefresh,
      child: ListView.builder(
        padding: const EdgeInsets.all(20),
        itemCount: jobs.length,
        itemBuilder: (context, index) {
          final job = jobs[index];
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: AppCard(
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
                      color: _statusColor(job.status).withValues(alpha: 0.1),
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
                        if (job.householdName != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            'Household: ${job.householdName}',
                            style: AppTypography.overline.copyWith(color: AppColors.primary),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  JobStatusBadge(status: job.status),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Color _statusColor(JobStatus status) {
    switch (status) {
      case JobStatus.assigned:
        return AppColors.badgeAssigned;
      case JobStatus.inProgress:
        return AppColors.badgeInProgress;
      case JobStatus.completed:
        return AppColors.badgeCompleted;
      case JobStatus.validated:
        return AppColors.badgeValidated;
      case JobStatus.rated:
        return AppColors.badgeRated;
      default:
        return AppColors.textSecondary;
    }
  }

  IconData _statusIcon(JobStatus status) {
    switch (status) {
      case JobStatus.assigned:
        return Icons.assignment_outlined;
      case JobStatus.inProgress:
        return Icons.directions_run;
      case JobStatus.completed:
        return Icons.check_circle_outline;
      case JobStatus.validated:
        return Icons.verified_outlined;
      case JobStatus.rated:
        return Icons.star_outline;
      default:
        return Icons.work_outline;
    }
  }
}
