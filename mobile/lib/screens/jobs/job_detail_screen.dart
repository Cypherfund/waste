import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../config/app_theme.dart';
import '../../models/job.dart';
import '../../providers/jobs_provider.dart';
import '../../widgets/app_card.dart';
import '../../widgets/job_status_badge.dart';
import '../../widgets/loading_button.dart';

class JobDetailScreen extends StatelessWidget {
  const JobDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final job = ModalRoute.of(context)!.settings.arguments as Job;
    final provider = context.watch<JobsProvider>();

    // Find the latest version of this job from the provider
    final currentJob = provider.jobs.firstWhere(
      (j) => j.id == job.id,
      orElse: () => job,
    );

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text('Collection Details', style: AppTypography.heading3),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status header card
            AppCard(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppColors.primarySurface,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      _statusIcon(currentJob.status),
                      color: AppColors.primary,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Status', style: AppTypography.caption),
                      const SizedBox(height: 4),
                      JobStatusBadge(status: currentJob.status),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // Details card
            AppCard(
              child: Column(
                children: [
                  _DetailRow(
                    icon: Icons.location_on_outlined,
                    title: 'Pickup Address',
                    value: currentJob.locationAddress,
                  ),
                  const Divider(height: 24, color: AppColors.divider),
                  _DetailRow(
                    icon: Icons.calendar_today_outlined,
                    title: 'Scheduled Date',
                    value: _formatDate(currentJob.scheduledDate),
                  ),
                  const Divider(height: 24, color: AppColors.divider),
                  _DetailRow(
                    icon: Icons.access_time,
                    title: 'Time Window',
                    value: currentJob.scheduledTime,
                  ),
                  if (currentJob.collectorName != null) ...[
                    const Divider(height: 24, color: AppColors.divider),
                    _DetailRow(
                      icon: Icons.person_outline,
                      title: 'Assigned Collector',
                      value: currentJob.collectorName!,
                    ),
                  ],
                  if (currentJob.notes != null && currentJob.notes!.isNotEmpty) ...[
                    const Divider(height: 24, color: AppColors.divider),
                    _DetailRow(
                      icon: Icons.notes_outlined,
                      title: 'Notes',
                      value: currentJob.notes!,
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // Timeline card
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Timeline', style: AppTypography.subtitle.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 16),
                  _TimelineEntry(
                    label: 'Created',
                    time: currentJob.createdAt,
                    isActive: true,
                    isFirst: true,
                  ),
                  if (currentJob.assignedAt != null)
                    _TimelineEntry(label: 'Assigned', time: currentJob.assignedAt!, isActive: true),
                  if (currentJob.startedAt != null)
                    _TimelineEntry(label: 'Started', time: currentJob.startedAt!, isActive: true),
                  if (currentJob.completedAt != null)
                    _TimelineEntry(label: 'Completed', time: currentJob.completedAt!, isActive: true),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Actions
            if (currentJob.canValidate) ...[
              LoadingButton(
                label: 'Validate Collection',
                icon: Icons.verified_outlined,
                onPressed: () => _handleValidate(context, currentJob.id),
              ),
              const SizedBox(height: 12),
            ],

            if (currentJob.canRate) ...[
              LoadingButton(
                label: 'Rate Collector',
                icon: Icons.star_outline,
                color: AppColors.warning,
                onPressed: () => Navigator.pushNamed(
                  context,
                  '/rate-job',
                  arguments: currentJob,
                ),
              ),
              const SizedBox(height: 12),
            ],

            if (currentJob.canCancel)
              LoadingButton(
                label: 'Cancel Collection',
                icon: Icons.cancel_outlined,
                variant: ButtonVariant.danger,
                onPressed: () => _handleCancel(context, currentJob.id),
              ),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  IconData _statusIcon(JobStatus status) {
    switch (status) {
      case JobStatus.requested:
        return Icons.schedule;
      case JobStatus.assigned:
        return Icons.assignment_ind;
      case JobStatus.inProgress:
        return Icons.directions_run;
      case JobStatus.completed:
        return Icons.check_circle;
      case JobStatus.validated:
        return Icons.verified;
      case JobStatus.rated:
        return Icons.star;
      case JobStatus.cancelled:
        return Icons.cancel;
      case JobStatus.disputed:
        return Icons.gavel;
    }
  }

  Future<void> _handleValidate(BuildContext context, String jobId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: AppRadius.cardBorder),
        title: Text('Validate Collection', style: AppTypography.heading3),
        content: Text(
          'Confirm that the waste was collected successfully?',
          style: AppTypography.body.copyWith(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Validate'),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      final success = await context.read<JobsProvider>().validateJob(jobId);
      if (success && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Collection validated!'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    }
  }

  Future<void> _handleCancel(BuildContext context, String jobId) async {
    final reasonController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: AppRadius.cardBorder),
        title: Text('Cancel Collection', style: AppTypography.heading3),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Are you sure you want to cancel this collection?',
              style: AppTypography.body.copyWith(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: reasonController,
              decoration: InputDecoration(
                labelText: 'Reason (optional)',
                border: OutlineInputBorder(
                  borderRadius: AppRadius.inputBorder,
                ),
              ),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Keep'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Cancel Job', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      final success = await context.read<JobsProvider>().cancelJob(
            jobId,
            reason: reasonController.text.trim(),
          );
      if (success && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Collection cancelled.'),
            backgroundColor: AppColors.warning,
          ),
        );
      }
    }
    reasonController.dispose();
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      return DateFormat('EEEE, MMMM d, yyyy').format(date);
    } catch (_) {
      return dateStr;
    }
  }
}

// ─── Detail Row ──────────────────────────────────────────────────────────────

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;

  const _DetailRow({
    required this.icon,
    required this.title,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: AppColors.primarySurface,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 18, color: AppColors.primary),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: AppTypography.caption),
              const SizedBox(height: 2),
              Text(value, style: AppTypography.bodyMedium),
            ],
          ),
        ),
      ],
    );
  }
}

// ─── Timeline Entry ──────────────────────────────────────────────────────────

class _TimelineEntry extends StatelessWidget {
  final String label;
  final DateTime time;
  final bool isActive;
  final bool isFirst;

  const _TimelineEntry({
    required this.label,
    required this.time,
    required this.isActive,
    this.isFirst = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Column(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: isActive ? AppColors.primary : AppColors.divider,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isActive ? AppColors.primary : AppColors.divider,
                    width: 2,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(width: 12),
          Text(label, style: AppTypography.bodyMedium),
          const Spacer(),
          Text(
            DateFormat('MMM d, HH:mm').format(time),
            style: AppTypography.caption,
          ),
        ],
      ),
    );
  }
}
