import 'package:flutter/material.dart';
import 'dart:async';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../../config/app_theme.dart';
import '../../../../models/job.dart';
import '../../../../providers/job_provider.dart';

class BookingStatusRequestedScreen extends StatefulWidget {
  final String jobId;

  const BookingStatusRequestedScreen({
    super.key,
    required this.jobId,
  });

  @override
  State<BookingStatusRequestedScreen> createState() => _BookingStatusRequestedScreenState();
}

class _BookingStatusRequestedScreenState extends State<BookingStatusRequestedScreen> 
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  Timer? _refreshTimer;
  
  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat();
    
    // Refresh job status every 10 seconds
    _refreshTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      _refreshJobStatus();
    });
    
    // Initial load
    _refreshJobStatus();
  }
  
  @override
  void dispose() {
    _animationController.dispose();
    _refreshTimer?.cancel();
    super.dispose();
  }
  
  Future<void> _refreshJobStatus() async {
    final jobProvider = context.read<JobProvider>();
    await jobProvider.refreshJob(widget.jobId);
    
    // Check if job status has changed
    final job = jobProvider.getJob(widget.jobId);
    if (job != null && job.status != JobStatus.requested && mounted) {
      // Navigate to appropriate screen based on status
      _navigateToNextScreen(job);
    }
  }
  
  void _navigateToNextScreen(Job job) {
    switch (job.status) {
      case JobStatus.assigned:
        Navigator.pushReplacementNamed(
          context,
          '/booking-status-assigned',
          arguments: job.id,
        );
        break;
      case JobStatus.cancelled:
        Navigator.pushReplacementNamed(
          context,
          '/booking-cancelled',
          arguments: job.id,
        );
        break;
      default:
        // Stay on current screen
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7F4),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Booking Status',
          style: TextStyle(
            color: Colors.black,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
      ),
      body: Consumer<JobProvider>(
        builder: (context, jobProvider, _) {
          final job = jobProvider.getJob(widget.jobId);
          
          if (job == null) {
            return const Center(child: CircularProgressIndicator());
          }
          
          return RefreshIndicator(
            onRefresh: _refreshJobStatus,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  // Status Animation
                  _buildStatusAnimation(),
                  
                  const SizedBox(height: 32),
                  
                  // Status Message
                  _buildStatusMessage(),
                  
                  const SizedBox(height: 40),
                  
                  // Booking Details
                  _buildBookingDetails(job),
                  
                  const SizedBox(height: 24),
                  
                  // Info Card
                  _buildInfoCard(),
                  
                  const SizedBox(height: 80),
                ],
              ),
            ),
          );
        },
      ),
      bottomNavigationBar: _buildBottomActions(),
    );
  }
  
  Widget _buildStatusAnimation() {
    return Container(
      width: 200,
      height: 200,
      decoration: BoxDecoration(
        color: Colors.orange.shade50,
        shape: BoxShape.circle,
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Animated circles
          ...List.generate(3, (index) {
            return AnimatedBuilder(
              animation: _animationController,
              builder: (context, child) {
                final value = _animationController.value + (index * 0.33);
                final adjustedValue = value > 1 ? value - 1 : value;
                
                return Transform.scale(
                  scale: 0.5 + (adjustedValue * 0.5),
                  child: Container(
                    width: 200,
                    height: 200,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: Colors.orange.withOpacity(1 - adjustedValue),
                        width: 2,
                      ),
                    ),
                  ),
                );
              },
            );
          }),
          
          // Center image
          Image.asset(
            'assets/images/status/searching-for-a-collector.png',
            width: 100,
            height: 100,
            errorBuilder: (_, __, ___) => Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: Colors.orange.shade100,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.search,
                color: Colors.orange.shade700,
                size: 50,
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildStatusMessage() {
    return Column(
      children: [
        const Text(
          'Finding a collector for you',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Please wait while we assign the best available collector',
          style: TextStyle(
            fontSize: 16,
            color: Colors.grey.shade600,
            height: 1.4,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
  
  Widget _buildBookingDetails(Job job) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Booking ID
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Booking ID',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey.shade600,
                ),
              ),
              Text(
                job.id.substring(0, 8).toUpperCase(),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  fontFamily: 'monospace',
                ),
              ),
            ],
          ),
          
          const Divider(height: 24),
          
          // Date & Time
          _buildDetailRow(
            icon: Icons.calendar_today,
            label: 'Scheduled for',
            value: '${DateFormat('EEEE, d MMM').format(job.scheduledDate)} at ${job.scheduledTime}',
          ),
          
          const SizedBox(height: 16),
          
          // Location
          _buildDetailRow(
            icon: Icons.location_on,
            label: 'Pickup location',
            value: job.locationAddress,
          ),
          
          const SizedBox(height: 16),
          
          // Created Time
          _buildDetailRow(
            icon: Icons.access_time,
            label: 'Requested',
            value: _getTimeAgo(job.createdAt),
          ),
        ],
      ),
    );
  }
  
  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.grey.shade100,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            icon,
            color: Colors.grey.shade700,
            size: 16,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade600,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Colors.black87,
                  height: 1.3,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
  
  Widget _buildInfoCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.shade200),
      ),
      child: Row(
        children: [
          Icon(
            Icons.info_outline,
            color: Colors.blue.shade700,
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Average assignment time is 2-5 minutes. You\'ll be notified once a collector is assigned.',
              style: TextStyle(
                fontSize: 14,
                color: Colors.blue.shade800,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildBottomActions() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton(
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  side: BorderSide(color: Colors.red.shade400, width: 1.5),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: _showCancelDialog,
                child: Text(
                  'Cancel Booking',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.red.shade600,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                onPressed: () {
                  Navigator.pushReplacementNamed(
                    context,
                    '/bookings',
                  );
                },
                child: const Text(
                  'View All Bookings',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  void _showCancelDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Text('Cancel Booking?'),
        content: const Text(
          'Are you sure you want to cancel this booking? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Keep Booking'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              
              final jobProvider = context.read<JobProvider>();
              final success = await jobProvider.cancelJob(
                widget.jobId,
                reason: 'Cancelled by user',
              );
              
              if (success && mounted) {
                Navigator.pushReplacementNamed(
                  context,
                  '/booking-cancelled',
                  arguments: widget.jobId,
                );
              }
            },
            child: Text(
              'Yes, Cancel',
              style: TextStyle(color: Colors.red.shade600),
            ),
          ),
        ],
      ),
    );
  }
  
  String _getTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);
    
    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes} min ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours} hour${difference.inHours == 1 ? '' : 's'} ago';
    } else {
      return DateFormat('d MMM, h:mm a').format(dateTime);
    }
  }
}
