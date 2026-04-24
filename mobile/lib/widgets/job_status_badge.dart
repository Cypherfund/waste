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
      case JobStatus.REQUESTED:
        return 'Requested';
      case JobStatus.ASSIGNED:
        return 'Assigned';
      case JobStatus.IN_PROGRESS:
        return 'In Progress';
      case JobStatus.COMPLETED:
        return 'Completed';
      case JobStatus.VALIDATED:
        return 'Validated';
      case JobStatus.RATED:
        return 'Rated';
      case JobStatus.CANCELLED:
        return 'Cancelled';
      case JobStatus.DISPUTED:
        return 'Disputed';
    }
  }

  Color get _backgroundColor {
    switch (status) {
      case JobStatus.REQUESTED:
        return AppColors.badgeRequested.withOpacity(0.1);
      case JobStatus.ASSIGNED:
        return AppColors.badgeAssigned.withOpacity(0.1);
      case JobStatus.IN_PROGRESS:
        return AppColors.badgeInProgress.withOpacity(0.1);
      case JobStatus.COMPLETED:
        return AppColors.badgeCompleted.withOpacity(0.1);
      case JobStatus.VALIDATED:
        return AppColors.badgeValidated.withOpacity(0.1);
      case JobStatus.RATED:
        return AppColors.badgeRated.withOpacity(0.1);
      case JobStatus.CANCELLED:
        return AppColors.badgeCancelled.withOpacity(0.1);
      case JobStatus.DISPUTED:
        return AppColors.badgeDisputed.withOpacity(0.1);
    }
  }

  Color get _textColor {
    switch (status) {
      case JobStatus.REQUESTED:
        return AppColors.badgeRequested;
      case JobStatus.ASSIGNED:
        return AppColors.badgeAssigned;
      case JobStatus.IN_PROGRESS:
        return AppColors.badgeInProgress;
      case JobStatus.COMPLETED:
        return AppColors.badgeCompleted;
      case JobStatus.VALIDATED:
        return AppColors.badgeValidated;
      case JobStatus.RATED:
        return AppColors.badgeRated;
      case JobStatus.CANCELLED:
        return AppColors.badgeCancelled;
      case JobStatus.DISPUTED:
        return AppColors.badgeDisputed;
    }
  }
}
