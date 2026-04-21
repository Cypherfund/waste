import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/collector_jobs_provider.dart';
import '../../models/job.dart';
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
      appBar: AppBar(
        title: const Text('My Jobs'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Assigned'),
            Tab(text: 'In Progress'),
            Tab(text: 'Completed'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _JobTab(
            jobs: provider.assignedJobs,
            isLoading: provider.isLoading,
            emptyMessage: 'No assigned jobs',
            emptyIcon: Icons.assignment_outlined,
            onRefresh: () => provider.loadJobs(refresh: true),
          ),
          _JobTab(
            jobs: provider.inProgressJobs,
            isLoading: provider.isLoading,
            emptyMessage: 'No jobs in progress',
            emptyIcon: Icons.directions_run,
            onRefresh: () => provider.loadJobs(refresh: true),
          ),
          _JobTab(
            jobs: provider.completedJobs,
            isLoading: provider.isLoading,
            emptyMessage: 'No completed jobs',
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
  final IconData emptyIcon;
  final Future<void> Function() onRefresh;

  const _JobTab({
    required this.jobs,
    required this.isLoading,
    required this.emptyMessage,
    required this.emptyIcon,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading && jobs.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (jobs.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(emptyIcon, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 12),
            Text(emptyMessage, style: TextStyle(color: Colors.grey[600])),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: jobs.length,
        itemBuilder: (context, index) {
          final job = jobs[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: _statusColor(job.status).withOpacity(0.15),
                child: Icon(
                  _statusIcon(job.status),
                  color: _statusColor(job.status),
                ),
              ),
              title: Text(
                job.locationAddress,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${job.scheduledDate} • ${job.scheduledTime}',
                    style: TextStyle(color: Colors.grey[600], fontSize: 12),
                  ),
                  if (job.householdName != null)
                    Text(
                      'Household: ${job.householdName}',
                      style: TextStyle(color: Colors.grey[500], fontSize: 11),
                    ),
                ],
              ),
              trailing: JobStatusBadge(status: job.status),
              onTap: () => Navigator.pushNamed(
                context,
                '/collector-job-detail',
                arguments: job,
              ),
            ),
          );
        },
      ),
    );
  }

  Color _statusColor(JobStatus status) {
    switch (status) {
      case JobStatus.ASSIGNED:
        return Colors.orange;
      case JobStatus.IN_PROGRESS:
        return Colors.blue;
      case JobStatus.COMPLETED:
        return Colors.green;
      case JobStatus.VALIDATED:
        return Colors.teal;
      case JobStatus.RATED:
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }

  IconData _statusIcon(JobStatus status) {
    switch (status) {
      case JobStatus.ASSIGNED:
        return Icons.assignment;
      case JobStatus.IN_PROGRESS:
        return Icons.directions_run;
      case JobStatus.COMPLETED:
        return Icons.check_circle;
      case JobStatus.VALIDATED:
        return Icons.verified;
      case JobStatus.RATED:
        return Icons.star;
      default:
        return Icons.work;
    }
  }
}
