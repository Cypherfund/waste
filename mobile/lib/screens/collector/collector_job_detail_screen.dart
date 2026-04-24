import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../../config/app_theme.dart';
import '../../models/job.dart';
import '../../providers/collector_jobs_provider.dart';
import '../../widgets/app_card.dart';
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

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text('Job Details', style: AppTypography.heading3),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.textPrimary),
            onPressed: () => provider.refreshJob(liveJob.id),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
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
            AppCard(
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
                      _statusIcon(liveJob.status),
                      size: 24,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Status', style: AppTypography.caption),
                      const SizedBox(height: 4),
                      JobStatusBadge(status: liveJob.status),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // Job info card
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _InfoRow(
                    icon: Icons.location_on_outlined,
                    label: 'Pickup Address',
                    value: liveJob.locationAddress,
                  ),
                  const Divider(height: 24, color: AppColors.divider),
                  _InfoRow(
                    icon: Icons.calendar_today_outlined,
                    label: 'Scheduled Date',
                    value: liveJob.scheduledDate,
                  ),
                  const Divider(height: 24, color: AppColors.divider),
                  _InfoRow(
                    icon: Icons.access_time,
                    label: 'Time Window',
                    value: liveJob.scheduledTime,
                  ),
                  if (liveJob.householdName != null) ...[
                    const Divider(height: 24, color: AppColors.divider),
                    _InfoRow(
                      icon: Icons.person_outline,
                      label: 'Household',
                      value: liveJob.householdName!,
                    ),
                  ],
                  if (liveJob.notes != null &&
                      liveJob.notes!.isNotEmpty) ...[
                    const Divider(height: 24, color: AppColors.divider),
                    _InfoRow(
                      icon: Icons.notes_outlined,
                      label: 'Notes',
                      value: liveJob.notes!,
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
                  Text('Timeline',
                      style: AppTypography.subtitle
                          .copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 16),
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
            const SizedBox(height: AppSpacing.md),

            // Proof image preview
            if (_proofImage != null) ...[
              AppCard(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Proof Photo', style: AppTypography.subtitle),
                        IconButton(
                          icon: const Icon(Icons.close, size: 20, color: AppColors.textSecondary),
                          onPressed: () =>
                              setState(() => _proofImage = null),
                        ),
                      ],
                    ),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(AppRadius.sm),
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
              const SizedBox(height: AppSpacing.md),
            ],

            // Action buttons
            ..._buildActions(context, liveJob, provider),

            const SizedBox(height: AppSpacing.lg),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildActions(
      BuildContext context, Job job, CollectorJobsProvider provider) {
    final actions = <Widget>[];

    if (job.status == JobStatus.ASSIGNED) {
      actions.add(
        LoadingButton(
          label: 'Accept & Start Job',
          icon: Icons.play_arrow,
          isLoading: provider.isActioning,
          onPressed: () => _handleStartJob(provider, job.id),
        ),
      );
      actions.add(const SizedBox(height: 10));
      actions.add(
        LoadingButton(
          label: 'Reject Job',
          icon: Icons.close,
          variant: ButtonVariant.danger,
          onPressed:
              provider.isActioning ? null : () => _showRejectDialog(job.id),
        ),
      );
    } else if (job.status == JobStatus.IN_PROGRESS) {
      if (_proofImage == null) {
        actions.add(
          LoadingButton(
            label: 'Take Proof Photo',
            icon: Icons.camera_alt_outlined,
            variant: ButtonVariant.secondary,
            onPressed: _pickProofImage,
          ),
        );
        actions.add(const SizedBox(height: 10));
      }
      actions.add(
        LoadingButton(
          label: 'Complete Job',
          icon: Icons.check,
          isLoading: provider.isActioning,
          onPressed: _proofImage != null
              ? () => _handleCompleteJob(provider, job.id)
              : null,
        ),
      );
      if (_proofImage == null) {
        actions.add(const SizedBox(height: AppSpacing.sm));
        actions.add(
          Text(
            'Take a proof photo before completing the job',
            style: AppTypography.caption.copyWith(color: AppColors.textHint),
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
        shape: RoundedRectangleBorder(borderRadius: AppRadius.cardBorder),
        title: Text('Start Job', style: AppTypography.heading3),
        content: Text(
            'Accept this job and start the collection? '
            'Location tracking will begin.',
            style: AppTypography.body.copyWith(color: AppColors.textSecondary)),
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
                content: Text('Job started! Location tracking active.'),
                backgroundColor: AppColors.success),
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
        shape: RoundedRectangleBorder(borderRadius: AppRadius.cardBorder),
        title: Text('Complete Job', style: AppTypography.heading3),
        content: Text(
            'Mark this job as completed? The proof photo will be uploaded.',
            style: AppTypography.body.copyWith(color: AppColors.textSecondary)),
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
              content: Text('Job completed! Waiting for validation.'),
              backgroundColor: AppColors.success),
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
        shape: RoundedRectangleBorder(borderRadius: AppRadius.cardBorder),
        title: Text('Reject Job', style: AppTypography.heading3),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Are you sure you want to reject this job?',
                style: AppTypography.body.copyWith(color: AppColors.textSecondary)),
            const SizedBox(height: 12),
            TextField(
              controller: _rejectReasonController,
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
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
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
        const SnackBar(content: Text('Job rejected'), backgroundColor: AppColors.warning),
      );
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
      case JobStatus.VALIDATED:
        return Icons.verified_outlined;
      case JobStatus.RATED:
        return Icons.star_outline;
      default:
        return Icons.work_outline;
    }
  }
}

// ─── Info Row ────────────────────────────────────────────────────────────────

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
              Text(label, style: AppTypography.caption),
              const SizedBox(height: 2),
              Text(value, style: AppTypography.bodyMedium),
            ],
          ),
        ),
      ],
    );
  }
}

// ─── Timeline Item ───────────────────────────────────────────────────────────

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
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              color: isActive ? AppColors.primary : AppColors.divider,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Text(label, style: AppTypography.bodyMedium),
          const Spacer(),
          Text(
            '${time.day}/${time.month} ${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}',
            style: AppTypography.caption,
          ),
        ],
      ),
    );
  }
}
