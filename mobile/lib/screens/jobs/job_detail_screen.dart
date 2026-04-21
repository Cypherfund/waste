import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../models/job.dart';
import '../../providers/jobs_provider.dart';
import '../../widgets/job_status_badge.dart';

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
      appBar: AppBar(
        title: const Text('Collection Details'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status header
            Center(child: JobStatusBadge(status: currentJob.status)),
            const SizedBox(height: 24),

            // Location
            _DetailSection(
              icon: Icons.location_on,
              title: 'Pickup Address',
              value: currentJob.locationAddress,
            ),
            const SizedBox(height: 16),

            // Schedule
            _DetailSection(
              icon: Icons.calendar_today,
              title: 'Scheduled Date',
              value: _formatDate(currentJob.scheduledDate),
            ),
            const SizedBox(height: 16),

            _DetailSection(
              icon: Icons.access_time,
              title: 'Time Window',
              value: currentJob.scheduledTime,
            ),
            const SizedBox(height: 16),

            // Collector info
            if (currentJob.collectorName != null) ...[
              _DetailSection(
                icon: Icons.person,
                title: 'Assigned Collector',
                value: currentJob.collectorName!,
              ),
              const SizedBox(height: 16),
            ],

            // Notes
            if (currentJob.notes != null && currentJob.notes!.isNotEmpty) ...[
              _DetailSection(
                icon: Icons.notes,
                title: 'Notes',
                value: currentJob.notes!,
              ),
              const SizedBox(height: 16),
            ],

            // Timestamps
            _DetailSection(
              icon: Icons.info_outline,
              title: 'Created',
              value: DateFormat('MMM d, yyyy HH:mm').format(currentJob.createdAt),
            ),
            if (currentJob.assignedAt != null) ...[
              const SizedBox(height: 12),
              _DetailSection(
                icon: Icons.assignment_ind,
                title: 'Assigned',
                value: DateFormat('MMM d, yyyy HH:mm').format(currentJob.assignedAt!),
              ),
            ],
            if (currentJob.startedAt != null) ...[
              const SizedBox(height: 12),
              _DetailSection(
                icon: Icons.play_circle_outline,
                title: 'Started',
                value: DateFormat('MMM d, yyyy HH:mm').format(currentJob.startedAt!),
              ),
            ],
            if (currentJob.completedAt != null) ...[
              const SizedBox(height: 12),
              _DetailSection(
                icon: Icons.check_circle_outline,
                title: 'Completed',
                value: DateFormat('MMM d, yyyy HH:mm').format(currentJob.completedAt!),
              ),
            ],

            const SizedBox(height: 32),

            // Action buttons
            if (currentJob.canValidate) ...[
              _ActionButton(
                label: 'Validate Collection',
                icon: Icons.verified,
                color: Colors.green,
                onPressed: () => _handleValidate(context, currentJob.id),
              ),
              const SizedBox(height: 12),
            ],

            if (currentJob.canRate) ...[
              _ActionButton(
                label: 'Rate Collector',
                icon: Icons.star,
                color: Colors.amber.shade700,
                onPressed: () => Navigator.pushNamed(
                  context,
                  '/rate-job',
                  arguments: currentJob,
                ),
              ),
              const SizedBox(height: 12),
            ],

            if (currentJob.canCancel)
              _ActionButton(
                label: 'Cancel Collection',
                icon: Icons.cancel,
                color: Colors.red,
                onPressed: () => _handleCancel(context, currentJob.id),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleValidate(BuildContext context, String jobId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Validate Collection'),
        content: const Text(
          'Confirm that the waste was collected successfully?',
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
            backgroundColor: Colors.green,
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
        title: const Text('Cancel Collection'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Are you sure you want to cancel this collection?'),
            const SizedBox(height: 16),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(
                labelText: 'Reason (optional)',
                border: OutlineInputBorder(),
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
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
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
            backgroundColor: Colors.orange,
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

class _DetailSection extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;

  const _DetailSection({
    required this.icon,
    required this.title,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: Colors.grey.shade600),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade500,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(fontSize: 15),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onPressed;

  const _ActionButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 48,
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, color: Colors.white),
        label: Text(label, style: const TextStyle(color: Colors.white, fontSize: 16)),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }
}
