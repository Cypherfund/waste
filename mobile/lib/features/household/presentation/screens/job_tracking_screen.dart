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
  Job? _job;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadJob();
  }

  Future<void> _loadJob() async {
    final jobProvider = context.read<JobProvider>();
    final job = jobProvider.jobs.firstWhere(
      (j) => j.id == widget.jobId,
      orElse: () => throw Exception('Job not found'),
    );

    setState(() {
      _job = job;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_job == null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('Job not found'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Go Back'),
              ),
            ],
          ),
        ),
      );
    }

    // Navigate to appropriate status screen based on job status
    switch (_job!.status) {
      case JobStatus.requested:
        return BookingStatusRequestedScreen(jobId: widget.jobId);
      case JobStatus.assigned:
        return BookingStatusRequestedScreen(jobId: widget.jobId);
      case JobStatus.inProgress:
        return BookingStatusOnTheWayScreen(jobId: widget.jobId);
      case JobStatus.completed:
        return BookingStatusCompletedScreen(jobId: widget.jobId);
      case JobStatus.validated:
        return BookingStatusCompletedScreen(jobId: widget.jobId);
      case JobStatus.rated:
        return BookingStatusCompletedScreen(jobId: widget.jobId);
      case JobStatus.cancelled:
        return BookingStatusCompletedScreen(jobId: widget.jobId);
      case JobStatus.disputed:
        return BookingStatusCompletedScreen(jobId: widget.jobId);
    }
  }
}
