import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../models/job.dart';
import '../../../../providers/job_provider.dart';
import 'booking_status_assigned_screen.dart';
import 'booking_status_requested_screen.dart';
import 'booking_status_on_the_way_screen.dart';
import 'booking_status_arrived_screen.dart';
import 'booking_status_completed_screen.dart';

class JobTrackingScreen extends StatefulWidget {
  final String jobId;

  const JobTrackingScreen({
    super.key,
    required this.jobId,
  });

  @override
  State<JobTrackingScreen> createState() => _JobTrackingScreenState();
}

class _JobTrackingScreenState extends State<JobTrackingScreen> {
  @override
  void initState() {
    super.initState();
    // Navigate to appropriate status screen based on job status
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _navigateToStatusScreen();
    });
  }

  void _navigateToStatusScreen() {
    final jobProvider = context.read<JobProvider>();
    final job = jobProvider.jobs.firstWhere(
      (j) => j.id == widget.jobId,
      orElse: () => throw Exception('Job not found'),
    );

    if (!mounted) return;

    // For assigned/inProgress, only show live tracking if the pickup is today or earlier.
    // If the pickup is scheduled for a future date, show the requested/pending screen instead.
    final scheduledDate = DateTime.tryParse(job.scheduledDate);
    final today = DateTime.now();
    final isPickupDay = scheduledDate == null ||
        !scheduledDate.isAfter(DateTime(today.year, today.month, today.day + 1));

    switch (job.status) {
      case JobStatus.paymentPending:
        break;
      case JobStatus.requested:
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => BookingStatusRequestedScreen(jobId: widget.jobId),
          ),
        );
        break;
      case JobStatus.assigned:
        // If the pickup hasn't arrived yet, show the "confirmed/upcoming" screen
        // rather than the "collector on the way" screen.
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => isPickupDay
                ? BookingStatusAssignedScreen(jobId: widget.jobId)
                : BookingStatusRequestedScreen(jobId: widget.jobId),
          ),
        );
        break;
      case JobStatus.inProgress:
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => isPickupDay
                ? BookingStatusOnTheWayScreen(jobId: widget.jobId)
                : BookingStatusAssignedScreen(jobId: widget.jobId),
          ),
        );
        break;
      case JobStatus.completed:
      case JobStatus.validated:
      case JobStatus.rated:
      case JobStatus.cancelled:
      case JobStatus.disputed:
      case JobStatus.paymentFailed:
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => BookingStatusCompletedScreen(jobId: widget.jobId),
          ),
        );
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}
