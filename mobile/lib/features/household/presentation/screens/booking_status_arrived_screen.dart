import 'package:flutter/material.dart';
import 'dart:async';
import 'package:provider/provider.dart';
import '../../../../config/app_theme.dart';
import '../../../../models/job.dart';
import '../../../../providers/job_provider.dart';

class BookingStatusArrivedScreen extends StatefulWidget {
  final String jobId;

  const BookingStatusArrivedScreen({
    super.key,
    required this.jobId,
  });

  @override
  State<BookingStatusArrivedScreen> createState() => _BookingStatusArrivedScreenState();
}

class _BookingStatusArrivedScreenState extends State<BookingStatusArrivedScreen> 
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  Timer? _refreshTimer;
  
  @override
  void initState() {
    super.initState();
    
    _pulseController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);
    
    // Refresh job status every 10 seconds
    _refreshTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      _refreshJobStatus();
    });
    
    // Initial load
    _refreshJobStatus();
  }
  
  @override
  void dispose() {
    _pulseController.dispose();
    _refreshTimer?.cancel();
    super.dispose();
  }
  
  Future<void> _refreshJobStatus() async {
    final jobProvider = context.read<JobProvider>();
    await jobProvider.refreshJob(widget.jobId);
    
    // Check if job status has changed
    final job = jobProvider.getJob(widget.jobId);
    if (job != null && job.status == JobStatus.completed && mounted) {
      // Navigate to completed screen
      Navigator.pushReplacementNamed(
        context,
        '/booking-status-completed',
        arguments: job.id,
      );
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
          'Collector Arrived',
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
                  // Arrived Animation
                  _buildArrivedAnimation(),
                  
                  const SizedBox(height: 32),
                  
                  // Status Message
                  _buildStatusMessage(),
                  
                  const SizedBox(height: 40),
                  
                  // Collector Info Card
                  _buildCollectorCard(),
                  
                  const SizedBox(height: 20),
                  
                  // Instructions Card
                  _buildInstructionsCard(),
                  
                  const SizedBox(height: 20),
                  
                  // Pickup Details
                  _buildPickupDetails(job),
                  
                  const SizedBox(height: 20),
                  
                  // Safety Tips
                  _buildSafetyTips(),
                  
                  const SizedBox(height: 100),
                ],
              ),
            ),
          );
        },
      ),
      bottomNavigationBar: _buildBottomActions(),
    );
  }
  
  Widget _buildArrivedAnimation() {
    return AnimatedBuilder(
      animation: _pulseController,
      builder: (context, child) {
        return Container(
          width: 180,
          height: 180,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1 * _pulseController.value),
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Container(
              width: 140,
              height: 140,
              decoration: BoxDecoration(
                color: AppColors.primary,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Center(
                child: Image.asset(
                  'assets/images/status/collector-arrived.png',
                  width: 80,
                  height: 80,
                  errorBuilder: (_, __, ___) => const Icon(
                    Icons.location_on,
                    color: Colors.white,
                    size: 60,
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
  
  Widget _buildStatusMessage() {
    return Column(
      children: [
        const Text(
          'Collector has arrived!',
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Please bring out your waste for pickup',
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
  
  Widget _buildCollectorCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 35,
                backgroundColor: AppColors.primaryLight.withValues(alpha: 0.2),
                child: Icon(
                  Icons.person,
                  color: AppColors.primary,
                  size: 35,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'John Doe',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          Icons.star,
                          color: Colors.orange,
                          size: 18,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '4.8',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.grey.shade700,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '• ID: CDR-1234',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    side: BorderSide(color: AppColors.primary),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: () => _showContactDialog('Call', '+237 6 70 00 00 00'),
                  icon: Icon(Icons.call, color: AppColors.primary),
                  label: Text(
                    'Call',
                    style: TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    side: BorderSide(color: AppColors.primary),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: () => _showContactDialog('Message', '+237 6 70 00 00 00'),
                  icon: Icon(Icons.message, color: AppColors.primary),
                  label: Text(
                    'Message',
                    style: TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
  
  Widget _buildInstructionsCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary.withValues(alpha: 0.1),
            AppColors.primaryLight.withValues(alpha: 0.05),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.primary.withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.info_outline,
                color: AppColors.primary,
                size: 24,
              ),
              const SizedBox(width: 12),
              const Text(
                'Next Steps',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildInstructionStep(1, 'Hand over your waste to the collector'),
          const SizedBox(height: 12),
          _buildInstructionStep(2, 'Wait for collector to take a photo as proof'),
          const SizedBox(height: 12),
          _buildInstructionStep(3, 'Make payment in cash (2,500 XAF)'),
        ],
      ),
    );
  }
  
  Widget _buildInstructionStep(int number, String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            color: AppColors.primary,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              number.toString(),
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              fontSize: 15,
              color: Colors.black87,
              height: 1.3,
            ),
          ),
        ),
      ],
    );
  }
  
  Widget _buildPickupDetails(Job job) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Pickup Details',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 16),
          
          _buildDetailItem(
            icon: Icons.location_on_outlined,
            label: 'Location',
            value: job.locationAddress,
          ),
          
          const SizedBox(height: 12),
          
          _buildDetailItem(
            icon: Icons.access_time,
            label: 'Time window',
            value: job.scheduledTime,
          ),
          
          const SizedBox(height: 12),
          
          _buildDetailItem(
            icon: Icons.attach_money,
            label: 'Total amount',
            value: '2,500 XAF',
            valueColor: AppColors.primary,
          ),
        ],
      ),
    );
  }
  
  Widget _buildDetailItem({
    required IconData icon,
    required String label,
    required String value,
    Color? valueColor,
  }) {
    return Row(
      children: [
        Icon(icon, color: Colors.grey.shade600, size: 20),
        const SizedBox(width: 8),
        Expanded(
          child: RichText(
            text: TextSpan(
              text: '$label: ',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey.shade600,
              ),
              children: [
                TextSpan(
                  text: value,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: valueColor ?? Colors.black87,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
  
  Widget _buildSafetyTips() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.amber.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.amber.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.security,
                color: Colors.amber.shade800,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'Safety Tips',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.amber.shade900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildSafetyTip('Verify collector ID before handing over waste'),
          const SizedBox(height: 8),
          _buildSafetyTip('Ensure collector takes photo before leaving'),
          const SizedBox(height: 8),
          _buildSafetyTip('Get a receipt after payment if possible'),
        ],
      ),
    );
  }
  
  Widget _buildSafetyTip(String tip) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '• ',
          style: TextStyle(
            fontSize: 14,
            color: Colors.amber.shade800,
          ),
        ),
        Expanded(
          child: Text(
            tip,
            style: TextStyle(
              fontSize: 14,
              color: Colors.amber.shade800,
              height: 1.3,
            ),
          ),
        ),
      ],
    );
  }
  
  Widget _buildBottomActions() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  elevation: 0,
                ),
                onPressed: _showIssueDialog,
                child: const Text(
                  'Report an Issue',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Pickup in progress',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  void _showContactDialog(String action, String number) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: Text('$action Collector'),
        content: Text(
          'Contact collector at $number?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              // In production, launch phone/sms app
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Opening $action app...'),
                ),
              );
            },
            child: Text(action),
          ),
        ],
      ),
    );
  }
  
  void _showIssueDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Text('Report Issue'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'What issue are you experiencing?',
            ),
            const SizedBox(height: 16),
            _buildIssueOption(
              'Collector not found',
              () {
                Navigator.pop(context);
                _reportIssue('Collector not found');
              },
            ),
            _buildIssueOption(
              'Wrong location',
              () {
                Navigator.pop(context);
                _reportIssue('Wrong location');
              },
            ),
            _buildIssueOption(
              'Collector behavior',
              () {
                Navigator.pop(context);
                _reportIssue('Collector behavior');
              },
            ),
            _buildIssueOption(
              'Other issue',
              () {
                Navigator.pop(context);
                _reportIssue('Other issue');
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }
  
  Widget _buildIssueOption(String text, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
        margin: const EdgeInsets.symmetric(vertical: 4),
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 16,
          ),
        ),
      ),
    );
  }
  
  void _reportIssue(String issue) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Issue reported: $issue'),
        backgroundColor: Colors.orange.shade600,
      ),
    );
  }
}
