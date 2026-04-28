import 'dart:async';

import 'package:flutter/material.dart';
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
  State<BookingStatusRequestedScreen> createState() =>
      _BookingStatusRequestedScreenState();
}

class _BookingStatusRequestedScreenState
    extends State<BookingStatusRequestedScreen> {
  Timer? _refreshTimer;
  bool _isCancelling = false;

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshJobStatus();
    });

    _refreshTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      _refreshJobStatus();
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _refreshJobStatus() async {
    if (!mounted || _isCancelling) return;

    final jobProvider = context.read<JobProvider>();
    await jobProvider.refreshJob(widget.jobId);

    final job = jobProvider.getJob(widget.jobId);

    if (!mounted || job == null) return;

    if (job.status != JobStatus.requested) {
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

      case JobStatus.inProgress:
        Navigator.pushReplacementNamed(
          context,
          '/booking-status-on-the-way',
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
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leadingWidth: 44,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            color: Color(0xFF111827),
            size: 16,
          ),
          onPressed: _isCancelling ? null : () => Navigator.pop(context),
        ),
        title: const Text(
          'My Booking',
          style: TextStyle(
            color: Color(0xFF111827),
            fontSize: 13,
            fontWeight: FontWeight.w800,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        top: false,
        child: Consumer<JobProvider>(
          builder: (context, jobProvider, _) {
            final job = jobProvider.getJob(widget.jobId);

            if (job == null) {
              return Center(
                child: CircularProgressIndicator(
                  color: AppColors.primary,
                ),
              );
            }

            return Column(
              children: [
                Expanded(
                  child: RefreshIndicator(
                    color: AppColors.primary,
                    onRefresh: _refreshJobStatus,
                    child: SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(20, 10, 20, 28),
                      child: Column(
                        children: [
                          const SizedBox(height: 2),
                          Text(
                            'Requested',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w900,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(height: 14),
                          const Text(
                            "We're finding a collector\nnear you...",
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 13,
                              height: 1.45,
                              fontWeight: FontWeight.w500,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                          const SizedBox(height: 18),
                          _buildStatusIllustration(),
                          const SizedBox(height: 18),
                          _buildBookingCard(job),
                        ],
                      ),
                    ),
                  ),
                ),
                _buildBottomActions(job),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildBottomActions(Job job) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(
            color: Color(0xFFE5E7EB),
            width: 1,
          ),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: SizedBox(
                height: 48,
                child: OutlinedButton(
                  onPressed:
                  _isCancelling ? null : () => _showCancelConfirmation(job),
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
                      borderRadius: BorderRadius.circular(9),
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
                    'Cancel Booking',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: _isCancelling
                      ? null
                      : () {
                    Navigator.pushNamed(context, '/support');
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor:
                    AppColors.primary.withValues(alpha: 0.55),
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(9),
                    ),
                  ),
                  child: const Text(
                    'Contact Support',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
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

  Future<void> _showCancelConfirmation(Job job) async {
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
          content: const Text(
            'Are you sure you want to cancel this pickup request? This action cannot be undone.',
            style: TextStyle(
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
            )

          ],
        );
      },
    );

    if (shouldCancel == true && mounted) {
      await _cancelBooking(job);
    }
  }

  Future<void> _cancelBooking(Job job) async {
    setState(() {
      _isCancelling = true;
    });

    try {
      final jobProvider = context.read<JobProvider>();

      final success = await jobProvider.cancelJob(job.id);

      if (!mounted) return;

      if (success == true) {
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
        SnackBar(
          content: const Text('Unable to cancel booking. Please try again.'),
          backgroundColor: Colors.red.shade600,
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isCancelling = false;
        });
      }
    }
  }

  Widget _buildStatusIllustration() {
    return SizedBox(
      width: double.infinity,
      height: 142,
      child: Stack(
        alignment: Alignment.center,
        children: [
          const Positioned.fill(
            child: CustomPaint(
              painter: _MiniConfettiPainter(),
            ),
          ),
          Image.asset(
            'assets/images/status/searching-for-a-collector.png',
            width: 200,
            height: 200,
            fit: BoxFit.contain,
            errorBuilder: (_, __, ___) {
              return Container(
                width: 118,
                height: 118,
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF7EF),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Icon(
                  Icons.search_rounded,
                  size: 58,
                  color: AppColors.primary,
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildBookingCard(Job job) {
    final date = DateTime.tryParse(job.scheduledDate);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(9),
        border: Border.all(color: const Color(0xFFE5E7EB)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.025),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildDetailLine(
            title: date == null
                ? job.scheduledDate
                : DateFormat('EEE, d MMM yyyy').format(date),
            subtitle: job.scheduledTime,
          ),
          const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.location_on_outlined,
                size: 16,
                color: Color(0xFF6B7280),
              ),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  job.locationAddress,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 11,
                    height: 1.35,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF6B7280),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            'Ref: #KTR-${_shortId(job.id)}',
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w500,
              color: Color(0xFF9CA3AF),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailLine({
    required String title,
    required String subtitle,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(
          Icons.calendar_today_outlined,
          size: 16,
          color: Color(0xFF6B7280),
        ),
        const SizedBox(width: 7),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 12,
                  height: 1.3,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF111827),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 11,
                  height: 1.3,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF111827),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _shortId(String id) {
    if (id.length <= 8) return id.toUpperCase();
    return id.substring(0, 8).toUpperCase();
  }
}

class _MiniConfettiPainter extends CustomPainter {
  const _MiniConfettiPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final pieces = [
      _Dot(size.width * 0.17, size.height * 0.32, const Color(0xFF2563EB)),
      _Dot(size.width * 0.27, size.height * 0.20, const Color(0xFFF59E0B)),
      _Dot(size.width * 0.35, size.height * 0.38, const Color(0xFF22C55E)),
      _Dot(size.width * 0.45, size.height * 0.16, const Color(0xFFEF4444)),
      _Dot(size.width * 0.58, size.height * 0.25, const Color(0xFF22C55E)),
      _Dot(size.width * 0.67, size.height * 0.15, const Color(0xFF2563EB)),
      _Dot(size.width * 0.78, size.height * 0.34, const Color(0xFFEF4444)),
      _Dot(size.width * 0.22, size.height * 0.62, const Color(0xFFF59E0B)),
      _Dot(size.width * 0.70, size.height * 0.60, const Color(0xFF22C55E)),
      _Dot(size.width * 0.80, size.height * 0.54, const Color(0xFF2563EB)),
    ];

    for (final dot in pieces) {
      final paint = Paint()
        ..color = dot.color
        ..style = PaintingStyle.fill;

      canvas.drawCircle(
        Offset(dot.x, dot.y),
        2.2,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _MiniConfettiPainter oldDelegate) => false;
}

class _Dot {
  final double x;
  final double y;
  final Color color;

  const _Dot(this.x, this.y, this.color);
}