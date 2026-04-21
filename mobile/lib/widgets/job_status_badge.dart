import 'package:flutter/material.dart';
import '../models/job.dart';

class JobStatusBadge extends StatelessWidget {
  final JobStatus status;

  const JobStatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: _backgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        _label,
        style: TextStyle(
          color: _textColor,
          fontSize: 12,
          fontWeight: FontWeight.w600,
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
        return Colors.blue.shade50;
      case JobStatus.ASSIGNED:
        return Colors.orange.shade50;
      case JobStatus.IN_PROGRESS:
        return Colors.amber.shade50;
      case JobStatus.COMPLETED:
        return Colors.green.shade50;
      case JobStatus.VALIDATED:
        return Colors.teal.shade50;
      case JobStatus.RATED:
        return Colors.purple.shade50;
      case JobStatus.CANCELLED:
        return Colors.red.shade50;
      case JobStatus.DISPUTED:
        return Colors.deepOrange.shade50;
    }
  }

  Color get _textColor {
    switch (status) {
      case JobStatus.REQUESTED:
        return Colors.blue.shade700;
      case JobStatus.ASSIGNED:
        return Colors.orange.shade700;
      case JobStatus.IN_PROGRESS:
        return Colors.amber.shade800;
      case JobStatus.COMPLETED:
        return Colors.green.shade700;
      case JobStatus.VALIDATED:
        return Colors.teal.shade700;
      case JobStatus.RATED:
        return Colors.purple.shade700;
      case JobStatus.CANCELLED:
        return Colors.red.shade700;
      case JobStatus.DISPUTED:
        return Colors.deepOrange.shade700;
    }
  }
}
