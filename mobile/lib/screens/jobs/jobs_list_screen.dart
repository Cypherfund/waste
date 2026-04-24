import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../config/app_theme.dart';
import '../../models/job.dart';
import '../../providers/jobs_provider.dart';
import '../../widgets/app_card.dart';
import '../../widgets/job_status_badge.dart';

class JobsListScreen extends StatefulWidget {
  const JobsListScreen({super.key});

  @override
  State<JobsListScreen> createState() => _JobsListScreenState();
}

class _JobsListScreenState extends State<JobsListScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<JobsProvider>().loadJobs(refresh: true);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<JobsProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text('My Collections', style: AppTypography.heading3),
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
                Tab(text: 'Active'),
                Tab(text: 'Completed'),
                Tab(text: 'All'),
              ],
            ),
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _JobList(
            jobs: provider.activeJobs,
            isLoading: provider.isLoading,
            error: provider.error,
            onRefresh: () => provider.loadJobs(refresh: true),
            emptyMessage: 'No active collections',
            emptySubtitle: 'Schedule a pickup to get started',
            emptyIcon: Icons.check_circle_outline,
          ),
          _JobList(
            jobs: provider.completedJobs,
            isLoading: provider.isLoading,
            error: provider.error,
            onRefresh: () => provider.loadJobs(refresh: true),
            emptyMessage: 'No completed collections yet',
            emptySubtitle: 'Completed pickups will appear here',
            emptyIcon: Icons.history,
          ),
          _JobList(
            jobs: provider.jobs,
            isLoading: provider.isLoading,
            error: provider.error,
            onRefresh: () => provider.loadJobs(refresh: true),
            emptyMessage: 'No collections found',
            emptySubtitle: 'Your collection history is empty',
            emptyIcon: Icons.inbox_outlined,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.pushNamed(context, '/create-job'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 4,
        shape: RoundedRectangleBorder(borderRadius: AppRadius.buttonBorder),
        icon: const Icon(Icons.add),
        label: Text('New Collection', style: AppTypography.bodyMedium.copyWith(color: Colors.white)),
      ),
    );
  }
}

class _JobList extends StatelessWidget {
  final List<Job> jobs;
  final bool isLoading;
  final String? error;
  final VoidCallback onRefresh;
  final String emptyMessage;
  final String emptySubtitle;
  final IconData emptyIcon;

  const _JobList({
    required this.jobs,
    required this.isLoading,
    required this.error,
    required this.onRefresh,
    required this.emptyMessage,
    required this.emptySubtitle,
    required this.emptyIcon,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading && jobs.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (error != null && jobs.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: AppColors.error.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(Icons.error_outline, size: 32, color: AppColors.error),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(error!, textAlign: TextAlign.center, style: AppTypography.body),
              const SizedBox(height: AppSpacing.md),
              ElevatedButton(onPressed: onRefresh, child: const Text('Retry')),
            ],
          ),
        ),
      );
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
      onRefresh: () async => onRefresh(),
      child: ListView.builder(
        padding: const EdgeInsets.all(20),
        itemCount: jobs.length,
        itemBuilder: (context, index) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _JobCard(job: jobs[index]),
          );
        },
      ),
    );
  }
}

class _JobCard extends StatelessWidget {
  final Job job;

  const _JobCard({required this.job});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: () => Navigator.pushNamed(context, '/job-detail', arguments: job),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  job.locationAddress,
                  style: AppTypography.bodyMedium.copyWith(
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              JobStatusBadge(status: job.status),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Icon(Icons.calendar_today_outlined, size: 14, color: AppColors.textSecondary),
              const SizedBox(width: 6),
              Text(
                _formatDate(job.scheduledDate),
                style: AppTypography.caption,
              ),
              const SizedBox(width: 16),
              Icon(Icons.access_time, size: 14, color: AppColors.textSecondary),
              const SizedBox(width: 6),
              Text(
                job.scheduledTime,
                style: AppTypography.caption,
              ),
            ],
          ),
          if (job.collectorName != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.person_outline, size: 14, color: AppColors.textSecondary),
                const SizedBox(width: 6),
                Text(
                  'Collector: ${job.collectorName}',
                  style: AppTypography.caption.copyWith(color: AppColors.primary),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      return DateFormat('MMM d, yyyy').format(date);
    } catch (_) {
      return dateStr;
    }
  }
}
