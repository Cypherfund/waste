import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../../models/job.dart';
import '../../providers/collector_jobs_provider.dart';
import '../../widgets/job_status_badge.dart';
import '../../widgets/loading_button.dart';
import '../../widgets/error_banner.dart';

class CollectorJobDetailScreen extends StatefulWidget {
  const CollectorJobDetailScreen({super.key});

  @override
  State<CollectorJobDetailScreen> createState() =>
      _CollectorJobDetailScreenState();
}

class _CollectorJobDetailScreenState extends State<CollectorJobDetailScreen> {
  Job? _job;
  File? _proofImage;
  final _rejectReasonController = TextEditingController();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _job ??= ModalRoute.of(context)!.settings.arguments as Job;
  }

  @override
  void dispose() {
    _rejectReasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CollectorJobsProvider>();
    final liveJob = provider.getJobById(_job!.id) ?? _job!;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Job Details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => provider.refreshJob(liveJob.id),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (provider.error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: ErrorBanner(
                  message: provider.error!,
                  onDismiss: provider.clearError,
                ),
              ),

            // Status header
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Status',
                              style: TextStyle(
                                  color: Colors.grey[600], fontSize: 12)),
                          const SizedBox(height: 4),
                          JobStatusBadge(status: liveJob.status),
                        ],
                      ),
                    ),
                    Icon(
                      _statusIcon(liveJob.status),
                      size: 40,
                      color: theme.colorScheme.primary.withOpacity(0.3),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Job info
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _InfoRow(
                      icon: Icons.location_on,
                      label: 'Pickup Address',
                      value: liveJob.locationAddress,
                    ),
                    const Divider(height: 24),
                    _InfoRow(
                      icon: Icons.calendar_today,
                      label: 'Scheduled Date',
                      value: liveJob.scheduledDate,
                    ),
                    const Divider(height: 24),
                    _InfoRow(
                      icon: Icons.access_time,
                      label: 'Time Window',
                      value: liveJob.scheduledTime,
                    ),
                    if (liveJob.householdName != null) ...[
                      const Divider(height: 24),
                      _InfoRow(
                        icon: Icons.person,
                        label: 'Household',
                        value: liveJob.householdName!,
                      ),
                    ],
                    if (liveJob.notes != null &&
                        liveJob.notes!.isNotEmpty) ...[
                      const Divider(height: 24),
                      _InfoRow(
                        icon: Icons.notes,
                        label: 'Notes',
                        value: liveJob.notes!,
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Timeline
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Timeline',
                        style: theme.textTheme.titleSmall
                            ?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    if (liveJob.assignedAt != null)
                      _TimelineItem(
                        label: 'Assigned',
                        time: liveJob.assignedAt!,
                        isActive: true,
                      ),
                    if (liveJob.startedAt != null)
                      _TimelineItem(
                        label: 'Started',
                        time: liveJob.startedAt!,
                        isActive: true,
                      ),
                    if (liveJob.completedAt != null)
                      _TimelineItem(
                        label: 'Completed',
                        time: liveJob.completedAt!,
                        isActive: true,
                      ),
                    if (liveJob.validatedAt != null)
                      _TimelineItem(
                        label: 'Validated',
                        time: liveJob.validatedAt!,
                        isActive: true,
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Proof image preview
            if (_proofImage != null) ...[
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Proof Photo',
                              style: theme.textTheme.titleSmall),
                          IconButton(
                            icon: const Icon(Icons.close, size: 20),
                            onPressed: () =>
                                setState(() => _proofImage = null),
                          ),
                        ],
                      ),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.file(
                          _proofImage!,
                          height: 200,
                          width: double.infinity,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Action buttons
            ..._buildActions(context, liveJob, provider),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildActions(
      BuildContext context, Job job, CollectorJobsProvider provider) {
    final actions = <Widget>[];

    if (job.status == JobStatus.ASSIGNED) {
      // Accept + Start
      actions.add(
        LoadingButton(
          label: 'Accept & Start Job',
          isLoading: provider.isActioning,
          onPressed: () => _handleStartJob(provider, job.id),
        ),
      );
      actions.add(const SizedBox(height: 8));
      actions.add(
        OutlinedButton.icon(
          onPressed:
              provider.isActioning ? null : () => _showRejectDialog(job.id),
          icon: const Icon(Icons.close),
          label: const Text('Reject Job'),
          style: OutlinedButton.styleFrom(
            foregroundColor: Colors.red,
            minimumSize: const Size(double.infinity, 48),
          ),
        ),
      );
    } else if (job.status == JobStatus.IN_PROGRESS) {
      // Take photo + Complete
      if (_proofImage == null) {
        actions.add(
          OutlinedButton.icon(
            onPressed: _pickProofImage,
            icon: const Icon(Icons.camera_alt),
            label: const Text('Take Proof Photo'),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(double.infinity, 48),
            ),
          ),
        );
        actions.add(const SizedBox(height: 8));
      }
      actions.add(
        LoadingButton(
          label: 'Complete Job',
          isLoading: provider.isActioning,
          onPressed: _proofImage != null
              ? () => _handleCompleteJob(provider, job.id)
              : null,
        ),
      );
      if (_proofImage == null) {
        actions.add(const SizedBox(height: 4));
        actions.add(
          Text(
            'Take a proof photo before completing the job',
            style: TextStyle(color: Colors.grey[500], fontSize: 12),
            textAlign: TextAlign.center,
          ),
        );
      }
    }

    return actions;
  }

  Future<void> _handleStartJob(
      CollectorJobsProvider provider, String jobId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Start Job'),
        content: const Text(
            'Accept this job and start the collection? '
            'Location tracking will begin.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Start')),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      // Accept first, then start
      final accepted = await provider.acceptJob(jobId);
      if (accepted && mounted) {
        final started = await provider.startJob(jobId);
        if (started && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content: Text('Job started! Location tracking active.')),
          );
        }
      }
    }
  }

  Future<void> _handleCompleteJob(
      CollectorJobsProvider provider, String jobId) async {
    if (_proofImage == null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Complete Job'),
        content: const Text(
            'Mark this job as completed? The proof photo will be uploaded.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Complete')),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final success =
          await provider.completeJob(jobId, proofImage: _proofImage!);
      if (success && mounted) {
        setState(() => _proofImage = null);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Job completed! Waiting for validation.')),
        );
      }
    }
  }

  Future<void> _pickProofImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.camera,
      maxWidth: 1280,
      maxHeight: 1280,
      imageQuality: 80,
    );
    if (picked != null) {
      setState(() => _proofImage = File(picked.path));
    }
  }

  void _showRejectDialog(String jobId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reject Job'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Are you sure you want to reject this job?'),
            const SizedBox(height: 12),
            TextField(
              controller: _rejectReasonController,
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
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              Navigator.pop(ctx);
              _handleReject(jobId);
            },
            child: const Text('Reject'),
          ),
        ],
      ),
    );
  }

  Future<void> _handleReject(String jobId) async {
    final provider = context.read<CollectorJobsProvider>();
    final reason = _rejectReasonController.text.trim();
    final success = await provider.rejectJob(
      jobId,
      reason: reason.isNotEmpty ? reason : null,
    );
    _rejectReasonController.clear();
    if (success && mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Job rejected')),
      );
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

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: Colors.grey[600]),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: TextStyle(color: Colors.grey[600], fontSize: 12)),
              const SizedBox(height: 2),
              Text(value, style: const TextStyle(fontSize: 15)),
            ],
          ),
        ),
      ],
    );
  }
}

class _TimelineItem extends StatelessWidget {
  final String label;
  final DateTime time;
  final bool isActive;

  const _TimelineItem({
    required this.label,
    required this.time,
    required this.isActive,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(
            Icons.circle,
            size: 10,
            color: isActive ? Colors.green : Colors.grey[400],
          ),
          const SizedBox(width: 12),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
          const Spacer(),
          Text(
            '${time.day}/${time.month} ${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}',
            style: TextStyle(color: Colors.grey[600], fontSize: 12),
          ),
        ],
      ),
    );
  }
}
