import 'package:flutter/material.dart';
import '../config/app_theme.dart';
import '../models/job.dart';

/// A styled status badge for job states.
///
/// Displays the job status as a colored pill badge.
class JobStatusBadge extends StatelessWidget {
  final JobStatus status;

  const JobStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
        color: _backgroundColor,
        borderRadius: AppRadius.badgeBorder,
      ),
      child: Text(
        _label,
        style: AppTypography.overline.copyWith(
          color: _textColor,
          fontWeight: FontWeight.w600,
          fontSize: 11,
        ),
      ),
    );
  }

  String get _label {
    switch (status) {
      case JobStatus.requested:
        return 'Requested';
      case JobStatus.assigned:
        return 'Assigned';
      case JobStatus.inProgress:
        return 'In Progress';
      case JobStatus.completed:
        return 'Completed';
      case JobStatus.validated:
        return 'Validated';
      case JobStatus.rated:
        return 'Rated';
      case JobStatus.cancelled:
        return 'Cancelled';
      case JobStatus.disputed:
        return 'Disputed';
    }
  }

  Color get _backgroundColor {
    switch (status) {
      case JobStatus.requested:
        return AppColors.badgeRequested.withValues(alpha: 0.1);
      case JobStatus.assigned:
        return AppColors.badgeAssigned.withValues(alpha: 0.1);
      case JobStatus.inProgress:
        return AppColors.badgeInProgress.withValues(alpha: 0.1);
      case JobStatus.completed:
        return AppColors.badgeCompleted.withValues(alpha: 0.1);
      case JobStatus.validated:
        return AppColors.badgeValidated.withValues(alpha: 0.1);
      case JobStatus.rated:
        return AppColors.badgeRated.withValues(alpha: 0.1);
      case JobStatus.cancelled:
        return AppColors.badgeCancelled.withValues(alpha: 0.1);
      case JobStatus.disputed:
        return AppColors.badgeDisputed.withValues(alpha: 0.1);
    }
  }

  Color get _textColor {
    switch (status) {
      case JobStatus.requested:
        return AppColors.badgeRequested;
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
      case JobStatus.cancelled:
        return AppColors.badgeCancelled;
      case JobStatus.disputed:
        return AppColors.badgeDisputed;
    }
  }
}
