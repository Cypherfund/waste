import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../../config/app_theme.dart';
import '../../../../config/app_config.dart';
import '../../../../models/job.dart';
import '../../../../providers/job_provider.dart';

class BookingDetailsScreen extends StatefulWidget {
  final String jobId;

  const BookingDetailsScreen({
    super.key,
    required this.jobId,
  });

  @override
  State<BookingDetailsScreen> createState() => _BookingDetailsScreenState();
}

class _BookingDetailsScreenState extends State<BookingDetailsScreen> {
  bool _isCancelling = false;

  @override
  void initState() {
    super.initState();
    // Defer loading job details to avoid setState during build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadJobDetails();
    });
  }
  
  Future<void> _loadJobDetails() async {
    final jobProvider = context.read<JobProvider>();
    await jobProvider.refreshJob(widget.jobId);
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
          'Booking Details',
          style: TextStyle(
            color: Colors.black,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined, color: Colors.black),
            onPressed: () {
              // Share booking details
            },
          ),
        ],
      ),
      body: Consumer<JobProvider>(
        builder: (context, jobProvider, _) {
          final job = jobProvider.getJob(widget.jobId);
          
          if (job == null) {
            return const Center(child: CircularProgressIndicator());
          }
          
          return RefreshIndicator(
            onRefresh: _loadJobDetails,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status Header
                  _buildStatusHeader(job),
                  
                  const SizedBox(height: 24),
                  
                  // Booking ID Card
                  _buildBookingIdCard(job),
                  
                  const SizedBox(height: 20),
                  
                  // Pickup Details
                  _buildPickupDetails(job),
                  
                  const SizedBox(height: 20),
                  
                  // Collector Info (if assigned)
                  if (job.status == JobStatus.assigned ||
                      job.status == JobStatus.inProgress ||
                      job.status == JobStatus.completed ||
                      job.status == JobStatus.validated ||
                      job.status == JobStatus.rated)
                    _buildCollectorInfo(job),
                  
                  const SizedBox(height: 20),
                  
                  // Proof Photo (if completed)
                  if (job.status == JobStatus.completed ||
                      job.status == JobStatus.validated ||
                      job.status == JobStatus.rated)
                    _buildProofPhoto(job),
                  
                  const SizedBox(height: 20),
                  
                  // Rating (if rated)
                  if (job.status == JobStatus.rated && job.rating != null)
                    _buildRatingSection(job),
                  
                  const SizedBox(height: 20),
                  
                  // Timeline
                  _buildTimeline(job),
                  
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
  
  Widget _buildStatusHeader(Job job) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            _getStatusColor(job.status),
            _getStatusColor(job.status).withValues(alpha: 0.8),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: _getStatusColor(job.status).withValues(alpha: 0.3),
            blurRadius: 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  _getStatusIcon(job.status),
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _getStatusText(job.status),
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _getStatusDescription(job.status),
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.white.withValues(alpha: 0.9),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
  
  Widget _buildBookingIdCard(Job job) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Booking ID',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey.shade600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                job.id.substring(0, 8).toUpperCase(),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'monospace',
                ),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'Created',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey.shade600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                DateFormat('d MMM, h:mm a').format(job.createdAt),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ),
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
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 20),
          
          _buildDetailRow(
            icon: Icons.calendar_today,
            label: 'Date',
            value: DateFormat('EEEE, d MMMM yyyy').format(DateTime.parse(job.scheduledDate)),
          ),
          
          const SizedBox(height: 16),
          
          _buildDetailRow(
            icon: Icons.access_time,
            label: 'Time window',
            value: job.scheduledTime,
          ),
          
          const SizedBox(height: 16),
          
          _buildDetailRow(
            icon: Icons.location_on,
            label: 'Location',
            value: job.locationAddress,
            isMultiline: true,
          ),
          
          if (job.notes != null && job.notes!.isNotEmpty) ...[
            const SizedBox(height: 16),
            _buildDetailRow(
              icon: Icons.note,
              label: 'Notes',
              value: job.notes!,
              isMultiline: true,
            ),
          ],
        ],
      ),
    );
  }
  
  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    required String value,
    bool isMultiline = false,
  }) {
    return Row(
      crossAxisAlignment: isMultiline ? CrossAxisAlignment.start : CrossAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: AppColors.primaryLight.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            icon,
            color: AppColors.primary,
            size: 20,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey.shade600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 16,
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
  
  Widget _buildCollectorInfo(Job job) {
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
            'Collector',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              CircleAvatar(
                radius: 30,
                backgroundColor: AppColors.primaryLight.withValues(alpha: 0.2),
                child: Icon(
                  Icons.person,
                  color: AppColors.primary,
                  size: 30,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      job.collectorName ?? 'Collector',
                      style: const TextStyle(
                        fontSize: 18,
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
                          size: 16,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          job.collectorRating?.toStringAsFixed(1) ?? '4.8',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Colors.grey.shade700,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          job.collectorId != null ? '• ID: ${job.collectorId!.substring(0, 8)}' : '',
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
        ],
      ),
    );
  }
  
  Widget _buildProofPhoto(Job job) {
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
          Row(
            children: [
              Icon(
                Icons.photo_camera,
                color: AppColors.primary,
                size: 20,
              ),
              const SizedBox(width: 8),
              const Text(
                'Proof of Pickup',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            height: 200,
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(12),
            ),
            child: job.proof?.imageUrl != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(
                      _resolveImageUrl(job.proof!.imageUrl),
                      fit: BoxFit.cover,
                      width: double.infinity,
                      loadingBuilder: (context, child, progress) {
                        if (progress == null) return child;
                        return Container(
                          color: Colors.grey.shade100,
                          child: Center(
                            child: CircularProgressIndicator(
                              value: progress.expectedTotalBytes != null
                                  ? progress.cumulativeBytesLoaded / progress.expectedTotalBytes!
                                  : null,
                              strokeWidth: 2,
                            ),
                          ),
                        );
                      },
                      errorBuilder: (context, error, stackTrace) {
                        return _buildPhotoPlaceholder();
                      },
                    ),
                  )
                : _buildPhotoPlaceholder(),
          ),
        ],
      ),
    );
  }
  
  String _resolveImageUrl(String url) {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    final base = AppConfig.apiBaseUrl.replaceAll(RegExp(r'/api/v\d+/?$'), '');
    return '$base${url.startsWith('/') ? '' : '/'}$url';
  }

  Widget _buildPhotoPlaceholder() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.image,
            size: 60,
            color: Colors.grey.shade400,
          ),
          const SizedBox(height: 8),
          Text(
            'Proof photo',
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey.shade500,
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildRatingSection(Job job) {
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
            'Your Rating',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              ...List.generate(5, (index) => Icon(
                index < job.rating! ? Icons.star : Icons.star_border,
                size: 32,
                color: Colors.orange,
              )),
              const SizedBox(width: 16),
              Text(
                '${job.rating}/5',
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
            ],
          ),
          if (job.ratingComment != null && job.ratingComment!.isNotEmpty) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                job.ratingComment!,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey.shade700,
                  height: 1.4,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
  
  Widget _buildTimeline(Job job) {
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
            'Timeline',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 20),
          
          _buildTimelineItem(
            icon: Icons.check_circle,
            title: 'Booking created',
            time: DateFormat('d MMM, h:mm a').format(job.createdAt),
            isCompleted: true,
          ),
          
          if (job.assignedAt != null) ...[
            _buildTimelineItem(
              icon: Icons.person_add,
              title: 'Collector assigned',
              time: DateFormat('d MMM, h:mm a').format(job.assignedAt!),
              isCompleted: true,
            ),
          ],
          
          if (job.startedAt != null) ...[
            _buildTimelineItem(
              icon: Icons.local_shipping,
              title: 'Pickup started',
              time: DateFormat('d MMM, h:mm a').format(job.startedAt!),
              isCompleted: true,
            ),
          ],
          
          if (job.completedAt != null) ...[
            _buildTimelineItem(
              icon: Icons.check_circle,
              title: 'Pickup completed',
              time: DateFormat('d MMM, h:mm a').format(job.completedAt!),
              isCompleted: true,
            ),
          ],
          
          if (job.validatedAt != null) ...[
            _buildTimelineItem(
              icon: Icons.verified,
              title: 'Confirmed by you',
              time: DateFormat('d MMM, h:mm a').format(job.validatedAt!),
              isCompleted: true,
            ),
          ],
          
          if (job.cancelledAt != null) ...[
            _buildTimelineItem(
              icon: Icons.cancel,
              title: 'Booking cancelled',
              time: DateFormat('d MMM, h:mm a').format(job.cancelledAt!),
              isCompleted: true,
              isError: true,
            ),
          ],
        ],
      ),
    );
  }
  
  Widget _buildTimelineItem({
    required IconData icon,
    required String title,
    required String time,
    required bool isCompleted,
    bool isError = false,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: isError
                  ? Colors.red.shade100
                  : isCompleted
                      ? Colors.green.shade100
                      : Colors.grey.shade100,
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: isError
                  ? Colors.red.shade700
                  : isCompleted
                      ? Colors.green.shade700
                      : Colors.grey.shade500,
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: isError
                        ? Colors.red.shade700
                        : isCompleted
                            ? Colors.black87
                            : Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  time,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey.shade600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
  
  Future<void> _showCancelConfirmation(Job job) async {
    final isAssigned = job.status == JobStatus.assigned;
    final shouldCancel = await showDialog<bool>(
      context: context,
      barrierDismissible: !_isCancelling,
      builder: (dialogContext) {
        return AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
          titlePadding: const EdgeInsets.fromLTRB(22, 22, 22, 8),
          contentPadding: const EdgeInsets.fromLTRB(22, 0, 22, 18),
          actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          title: const Text(
            'Cancel booking?',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: Color(0xFF111827),
            ),
          ),
          content: Text(
            isAssigned
                ? 'Are you sure you want to cancel? A collector has already been assigned.'
                : 'Are you sure you want to cancel this pickup request? This action cannot be undone.',
            style: const TextStyle(
              fontSize: 13,
              height: 1.45,
              fontWeight: FontWeight.w500,
              color: Color(0xFF6B7280),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text(
                'Yes, Cancel',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFFDC2626),
                ),
              ),
            ),
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text(
                'Keep Booking',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF111827),
                ),
              ),
            ),
          ],
        );
      },
    );

    if (shouldCancel == true && mounted) {
      await _cancelBooking(job);
    }
  }

  Future<void> _cancelBooking(Job job) async {
    setState(() => _isCancelling = true);

    try {
      final jobProvider = context.read<JobProvider>();
      final success = await jobProvider.cancelJob(job.id);

      if (!mounted) return;

      if (success) {
        Navigator.pushNamedAndRemoveUntil(
          context,
          '/bookings',
          (route) => route.settings.name == '/home',
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(jobProvider.error ?? 'Failed to cancel booking'),
            backgroundColor: Colors.red.shade600,
          ),
        );
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unable to cancel booking. Please try again.'),
          backgroundColor: Color(0xFFDC2626),
        ),
      );
    } finally {
      if (mounted) setState(() => _isCancelling = false);
    }
  }

  Widget _buildBottomActions() {
    return Consumer<JobProvider>(
      builder: (context, jobProvider, _) {
        final job = jobProvider.getJob(widget.jobId);
        
        if (job == null) return const SizedBox.shrink();
        
        // Show different actions based on status
        if (job.status == JobStatus.requested ||
            job.status == JobStatus.assigned) {
          return Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
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
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 52,
                      child: OutlinedButton(
                        onPressed: _isCancelling
                            ? null
                            : () => _showCancelConfirmation(job),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFFDC2626),
                          disabledForegroundColor:
                              const Color(0xFFDC2626).withValues(alpha: 0.45),
                          side: BorderSide(
                            color: _isCancelling
                                ? const Color(0xFFDC2626).withValues(alpha: 0.35)
                                : const Color(0xFFDC2626),
                            width: 1.2,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: _isCancelling
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Color(0xFFDC2626),
                                ),
                              )
                            : const Text(
                                'Cancel',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: SizedBox(
                      height: 52,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          disabledBackgroundColor:
                              AppColors.primary.withValues(alpha: 0.55),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          elevation: 0,
                        ),
                        onPressed: _isCancelling
                            ? null
                            : () {
                                Navigator.pushNamed(
                                  context,
                                  '/job-tracking',
                                  arguments: job.id,
                                );
                              },
                        child: const Text(
                          'Track Pickup',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        }

        if (job.status == JobStatus.inProgress) {
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
              top: false,
              child: SizedBox(
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
                  onPressed: () {
                    Navigator.pushNamed(
                      context,
                      '/job-tracking',
                      arguments: job.id,
                    );
                  },
                  child: const Text(
                    'Track Pickup',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),
          );
        }
        
        if (job.status == JobStatus.completed) {
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
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: Colors.red.shade400),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      onPressed: () {
                        // Report issue
                      },
                      child: Text(
                        'Report Issue',
                        style: TextStyle(
                          color: Colors.red.shade600,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        elevation: 0,
                      ),
                      onPressed: () {
                        Navigator.pushNamed(
                          context,
                          '/rate-collector',
                          arguments: job.id,
                        );
                      },
                      child: const Text(
                        'Rate Pickup',
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
        
        return const SizedBox.shrink();
      },
    );
  }
  
  Color _getStatusColor(JobStatus status) {
    switch (status) {
      case JobStatus.paymentPending:
        return Colors.purple;
      case JobStatus.requested:
        return Colors.orange;
      case JobStatus.assigned:
        return Colors.blue;
      case JobStatus.inProgress:
        return Colors.purple;
      case JobStatus.completed:
        return Colors.green;
      case JobStatus.validated:
        return Colors.green;
      case JobStatus.rated:
        return Colors.green;
      case JobStatus.cancelled:
        return Colors.red;
      case JobStatus.disputed:
        return Colors.red;
      case JobStatus.paymentFailed:
        return Colors.red;
    }
  }
  
  IconData _getStatusIcon(JobStatus status) {
    switch (status) {
      case JobStatus.paymentPending:
        return Icons.payment;
      case JobStatus.requested:
        return Icons.search;
      case JobStatus.assigned:
        return Icons.person;
      case JobStatus.inProgress:
        return Icons.local_shipping;
      case JobStatus.completed:
        return Icons.check_circle;
      case JobStatus.validated:
        return Icons.verified;
      case JobStatus.rated:
        return Icons.star;
      case JobStatus.cancelled:
        return Icons.cancel;
      case JobStatus.disputed:
        return Icons.warning;
      case JobStatus.paymentFailed:
        return Icons.payment_outlined;
    }
  }
  
  String _getStatusText(JobStatus status) {
    switch (status) {
      case JobStatus.paymentPending:
        return 'Payment Pending';
      case JobStatus.requested:
        return 'Finding Collector';
      case JobStatus.assigned:
        return 'Collector Assigned';
      case JobStatus.inProgress:
        return 'On the Way';
      case JobStatus.completed:
        return 'Completed';
      case JobStatus.validated:
        return 'Confirmed';
      case JobStatus.rated:
        return 'Rated';
      case JobStatus.cancelled:
        return 'Cancelled';
      case JobStatus.disputed:
        return 'Disputed';
      case JobStatus.paymentFailed:
        return 'Payment Failed';
    }
  }
  
  String _getStatusDescription(JobStatus status) {
    switch (status) {
      case JobStatus.paymentPending:
        return 'Waiting for admin to verify your payment';
      case JobStatus.requested:
        return 'We\'re looking for an available collector';
      case JobStatus.assigned:
        return 'A collector has been assigned to your pickup';
      case JobStatus.inProgress:
        return 'Collector is on the way to your location';
      case JobStatus.completed:
        return 'Pickup completed successfully';
      case JobStatus.validated:
        return 'Pickup confirmed by collector';
      case JobStatus.rated:
        return 'You have rated this pickup';
      case JobStatus.cancelled:
        return 'This pickup was cancelled';
      case JobStatus.disputed:
        return 'There is a dispute with this pickup';
      case JobStatus.paymentFailed:
        return 'Payment verification failed. Please contact support.';
    }
  }
}
