import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/collector_jobs_provider.dart';
import '../../providers/collector_earnings_provider.dart';
import '../../models/job.dart';
import '../../widgets/job_status_badge.dart';
import '../../widgets/sync_status_banner.dart';

class CollectorHomeScreen extends StatefulWidget {
  const CollectorHomeScreen({super.key});

  @override
  State<CollectorHomeScreen> createState() => _CollectorHomeScreenState();
}

class _CollectorHomeScreenState extends State<CollectorHomeScreen> {
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
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('WasteWise Collector'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => auth.logout(),
          ),
        ],
      ),
      body: Column(
        children: [
          const SyncStatusBanner(),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                await Future.wait([
                  jobs.loadJobs(refresh: true),
                  earnings.loadQuickSummary(),
                ]);
              },
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
            Text(
              'Hello, ${auth.user?.name ?? 'Collector'}!',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Manage your collection jobs',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 20),

            // Earnings quick summary
            if (earnings.quickSummary != null) ...[
              _EarningsSummaryCard(
                today: earnings.quickSummary!.today,
                thisWeek: earnings.quickSummary!.thisWeek,
                thisMonth: earnings.quickSummary!.thisMonth,
                onTap: () => Navigator.pushNamed(context, '/collector-earnings'),
              ),
              const SizedBox(height: 20),
            ],

            // Active jobs section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Active Jobs',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                TextButton(
                  onPressed: () =>
                      Navigator.pushNamed(context, '/collector-jobs'),
                  child: const Text('View All'),
                ),
              ],
            ),
            const SizedBox(height: 8),

            if (jobs.isLoading && jobs.jobs.isEmpty)
              const Center(child: CircularProgressIndicator())
            else if (jobs.activeJobs.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      Icon(Icons.check_circle_outline,
                          size: 48, color: Colors.grey[400]),
                      const SizedBox(height: 8),
                      Text(
                        'No active jobs',
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
              )
            else
              ...jobs.activeJobs
                  .take(5)
                  .map((job) => _CollectorJobCard(job: job)),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: 0,
        onTap: (index) {
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
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(
              icon: Icon(Icons.work), label: 'Jobs'),
          BottomNavigationBarItem(
              icon: Icon(Icons.account_balance_wallet), label: 'Earnings'),
        ],
      ),
    );
  }
}

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
    return Card(
      color: const Color(0xFF2E7D32),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Earnings',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _EarningColumn(label: 'Today', amount: today),
                  const SizedBox(width: 24),
                  _EarningColumn(label: 'This Week', amount: thisWeek),
                  const SizedBox(width: 24),
                  _EarningColumn(label: 'This Month', amount: thisMonth),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EarningColumn extends StatelessWidget {
  final String label;
  final double amount;

  const _EarningColumn({required this.label, required this.amount});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(color: Colors.white60, fontSize: 11)),
        const SizedBox(height: 2),
        Text(
          '${amount.toStringAsFixed(0)} XAF',
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
      ],
    );
  }
}

class _CollectorJobCard extends StatelessWidget {
  final Job job;

  const _CollectorJobCard({required this.job});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: job.status == JobStatus.IN_PROGRESS
              ? Colors.blue[100]
              : Colors.orange[100],
          child: Icon(
            job.status == JobStatus.IN_PROGRESS
                ? Icons.directions_run
                : Icons.assignment,
            color: job.status == JobStatus.IN_PROGRESS
                ? Colors.blue[700]
                : Colors.orange[700],
          ),
        ),
        title: Text(
          job.locationAddress,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          '${job.scheduledDate} • ${job.scheduledTime}',
          style: TextStyle(color: Colors.grey[600], fontSize: 12),
        ),
        trailing: JobStatusBadge(status: job.status),
        onTap: () => Navigator.pushNamed(
          context,
          '/collector-job-detail',
          arguments: job,
        ),
      ),
    );
  }
}
