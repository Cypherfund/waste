import 'package:flutter/material.dart';
import '../../../../models/job.dart';

/// Color-coded status badge for bookings and payments
class StatusBadge extends StatelessWidget {
  final JobStatus? jobStatus;
  final String? paymentStatus;
  final StatusBadgeSize size;

  const StatusBadge({
    super.key,
    this.jobStatus,
    this.paymentStatus,
    this.size = StatusBadgeSize.medium,
  });

  /// Factory for job status
  factory StatusBadge.forJob(Job job) {
    // Priority: payment status over job status for pending/failed states
    if (job.status == JobStatus.paymentPending) {
      return StatusBadge(
        jobStatus: job.status,
        paymentStatus: job.paymentStatus,
      );
    }
    return StatusBadge(jobStatus: job.status);
  }

  @override
  Widget build(BuildContext context) {
    final config = _getStatusConfig();
    
    return Container(
      padding: _getPadding(),
      decoration: BoxDecoration(
        color: config.backgroundColor,
        borderRadius: BorderRadius.circular(_getBorderRadius()),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (config.icon != null) ...[
            Icon(
              config.icon,
              size: _getIconSize(),
              color: config.textColor,
            ),
            SizedBox(width: size == StatusBadgeSize.small ? 4 : 6),
          ],
          Text(
            config.label,
            style: TextStyle(
              fontSize: _getFontSize(),
              fontWeight: FontWeight.w600,
              color: config.textColor,
            ),
          ),
        ],
      ),
    );
  }

  EdgeInsets _getPadding() {
    switch (size) {
      case StatusBadgeSize.small:
        return const EdgeInsets.symmetric(horizontal: 8, vertical: 4);
      case StatusBadgeSize.medium:
        return const EdgeInsets.symmetric(horizontal: 12, vertical: 6);
      case StatusBadgeSize.large:
        return const EdgeInsets.symmetric(horizontal: 16, vertical: 8);
    }
  }

  double _getBorderRadius() {
    switch (size) {
      case StatusBadgeSize.small:
        return 4;
      case StatusBadgeSize.medium:
        return 6;
      case StatusBadgeSize.large:
        return 8;
    }
  }

  double _getFontSize() {
    switch (size) {
      case StatusBadgeSize.small:
        return 11;
      case StatusBadgeSize.medium:
        return 13;
      case StatusBadgeSize.large:
        return 15;
    }
  }

  double _getIconSize() {
    switch (size) {
      case StatusBadgeSize.small:
        return 12;
      case StatusBadgeSize.medium:
        return 14;
      case StatusBadgeSize.large:
        return 16;
    }
  }

  _StatusConfig _getStatusConfig() {
    // Check payment status first for payment-specific states
    if (paymentStatus != null) {
      switch (paymentStatus) {
        case 'AWAITING_ADMIN_VERIFICATION':
          return _StatusConfig(
            label: 'Awaiting Verification',
            backgroundColor: const Color(0xFFFFF8E1),
            textColor: const Color(0xFFF57C00),
            icon: Icons.schedule,
          );
        case 'PROVIDER_PENDING':
          return _StatusConfig(
            label: 'Payment Pending',
            backgroundColor: const Color(0xFFFFF8E1),
            textColor: const Color(0xFFF57C00),
            icon: Icons.pending,
          );
        case 'VERIFIED':
          return _StatusConfig(
            label: 'Payment Verified',
            backgroundColor: const Color(0xFFE8F5E9),
            textColor: const Color(0xFF2E7D32),
            icon: Icons.check_circle,
          );
        case 'REJECTED':
        case 'FAILED':
          return _StatusConfig(
            label: 'Payment Failed',
            backgroundColor: const Color(0xFFFFEBEE),
            textColor: const Color(0xFFC62828),
            icon: Icons.error,
          );
        case 'PENDING':
          return _StatusConfig(
            label: 'Payment Pending',
            backgroundColor: const Color(0xFFFFF8E1),
            textColor: const Color(0xFFF57C00),
            icon: Icons.schedule,
          );
      }
    }

    // Fall back to job status
    switch (jobStatus) {
      case JobStatus.paymentPending:
        return _StatusConfig(
          label: 'Payment Pending',
          backgroundColor: const Color(0xFFFFF8E1),
          textColor: const Color(0xFFF57C00),
          icon: Icons.schedule,
        );
      case JobStatus.paymentFailed:
        return _StatusConfig(
          label: 'Payment Failed',
          backgroundColor: const Color(0xFFFFEBEE),
          textColor: const Color(0xFFC62828),
          icon: Icons.error,
        );
      case JobStatus.requested:
        return _StatusConfig(
          label: 'Requested',
          backgroundColor: const Color(0xFFE3F2FD),
          textColor: const Color(0xFF1976D2),
          icon: Icons.schedule,
        );
      case JobStatus.assigned:
        return _StatusConfig(
          label: 'Assigned',
          backgroundColor: const Color(0xFFE8F5E9),
          textColor: const Color(0xFF2E7D32),
          icon: Icons.person,
        );
      case JobStatus.inProgress:
        return _StatusConfig(
          label: 'In Progress',
          backgroundColor: const Color(0xFFE8F5E9),
          textColor: const Color(0xFF2E7D32),
          icon: Icons.local_shipping,
        );
      case JobStatus.completed:
        return _StatusConfig(
          label: 'Completed',
          backgroundColor: const Color(0xFFE8F5E9),
          textColor: const Color(0xFF2E7D32),
          icon: Icons.check_circle,
        );
      case JobStatus.validated:
        return _StatusConfig(
          label: 'Validated',
          backgroundColor: const Color(0xFFE8F5E9),
          textColor: const Color(0xFF2E7D32),
          icon: Icons.verified,
        );
      case JobStatus.rated:
        return _StatusConfig(
          label: 'Rated',
          backgroundColor: const Color(0xFFE8F5E9),
          textColor: const Color(0xFF2E7D32),
          icon: Icons.star,
        );
      case JobStatus.cancelled:
        return _StatusConfig(
          label: 'Cancelled',
          backgroundColor: const Color(0xFFFFEBEE),
          textColor: const Color(0xFFC62828),
          icon: Icons.cancel,
        );
      case JobStatus.disputed:
        return _StatusConfig(
          label: 'Disputed',
          backgroundColor: const Color(0xFFFFF8E1),
          textColor: const Color(0xFFF57C00),
          icon: Icons.warning,
        );
      default:
        return _StatusConfig(
          label: 'Unknown',
          backgroundColor: Colors.grey.shade200,
          textColor: Colors.grey.shade700,
        );
    }
  }
}

/// Status badge sizes
enum StatusBadgeSize {
  small,
  medium,
  large,
}

/// Internal config class
class _StatusConfig {
  final String label;
  final Color backgroundColor;
  final Color textColor;
  final IconData? icon;

  _StatusConfig({
    required this.label,
    required this.backgroundColor,
    required this.textColor,
    this.icon,
  });
}
