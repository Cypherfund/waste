import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../models/job.dart';
import '../../../../providers/job_provider.dart';
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

    // Navigate to appropriate status screen based on job status
    switch (job.status) {
      case JobStatus.requested:
      case JobStatus.assigned:
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => BookingStatusRequestedScreen(jobId: widget.jobId),
          ),
        );
        break;
      case JobStatus.inProgress:
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => BookingStatusOnTheWayScreen(jobId: widget.jobId),
          ),
        );
        break;
      case JobStatus.completed:
      case JobStatus.validated:
      case JobStatus.rated:
      case JobStatus.cancelled:
      case JobStatus.disputed:
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
