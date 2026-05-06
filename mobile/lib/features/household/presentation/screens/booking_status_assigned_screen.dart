import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../../../config/app_theme.dart';
import '../../../../models/job.dart';
import '../../../../providers/job_provider.dart';

class BookingStatusAssignedScreen extends StatefulWidget {
  final String jobId;

  const BookingStatusAssignedScreen({
    super.key,
    required this.jobId,
  });

  @override
  State<BookingStatusAssignedScreen> createState() =>
      _BookingStatusAssignedScreenState();
}

class _BookingStatusAssignedScreenState
    extends State<BookingStatusAssignedScreen> {
  Timer? _refreshTimer;

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
    if (!mounted) return;

    final jobProvider = context.read<JobProvider>();
    await jobProvider.refreshJob(widget.jobId);

    final job = jobProvider.getJob(widget.jobId);

    if (!mounted || job == null) return;

    if (job.status == JobStatus.inProgress) {
      Navigator.pushReplacementNamed(
        context,
        '/booking-status-on-the-way',
        arguments: job.id,
      );
    }

    if (job.status == JobStatus.cancelled) {
      Navigator.pushReplacementNamed(
        context,
        '/booking-cancelled',
        arguments: job.id,
      );
    }

    if (job.status == JobStatus.completed) {
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
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leadingWidth: 42,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            color: Color(0xFF111827),
            size: 16,
          ),
          onPressed: () => Navigator.pop(context),
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

            return RefreshIndicator(
              color: AppColors.primary,
              onRefresh: _refreshJobStatus,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
                child: Column(
                  children: [
                    Text(
                      'Assigned',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                        color: AppColors.primary,
                      ),
                    ),

                    const SizedBox(height: 12),

                    const Text(
                      'Your collector is on the way',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.35,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF6B7280),
                      ),
                    ),

                    const SizedBox(height: 20),

                    _buildCollectorCard(),

                    const SizedBox(height: 14),

                    _buildBookingInfoCard(job),

                    const SizedBox(height: 16),

                    _buildTrackButton(job),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildCollectorCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
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
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 30,
                backgroundColor: const Color(0xFFEAF5EA),
                backgroundImage: const AssetImage(
                  'assets/images/collectors/jean-claude.png',
                ),
                onBackgroundImageError: (_, __) {},
              ),

              const SizedBox(width: 13),

              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Jean Claude',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF111827),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: const [
                        Icon(
                          Icons.star_rounded,
                          color: Color(0xFFF59E0B),
                          size: 15,
                        ),
                        SizedBox(width: 4),
                        Text(
                          '4.8 (128 trips)',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF6B7280),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          Row(
            children: [
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'ETA',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF6B7280),
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      '25 min',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF111827),
                      ),
                    ),
                  ],
                ),
              ),

              _smallGreenButton(
                icon: Icons.call_rounded,
                onTap: () {},
              ),

              const SizedBox(width: 8),

              _smallGreenButton(
                icon: Icons.chat_bubble_outline_rounded,
                onTap: () {},
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _smallGreenButton({
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 34,
        height: 34,
        decoration: BoxDecoration(
          color: AppColors.background,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: const Color(0xFFD6EAD8),
            width: 1,
          ),
        ),
        child: Icon(
          icon,
          color: AppColors.primary,
          size: 18,
        ),
      ),
    );
  }

  Widget _buildBookingInfoCard(Job job) {
    final date = DateTime.tryParse(job.scheduledDate);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
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
        children: [
          Row(
            children: [
              Expanded(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.calendar_today_outlined,
                      size: 16,
                      color: Color(0xFF6B7280),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        date == null
                            ? '${job.scheduledDate}\n${job.scheduledTime}'
                            : '${DateFormat('EEE, d MMM yyyy').format(date)}\n${job.scheduledTime}',
                        style: const TextStyle(
                          fontSize: 11,
                          height: 1.45,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF111827),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
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

          const SizedBox(height: 13),

          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.location_on_outlined,
                size: 16,
                color: Color(0xFF6B7280),
              ),
              const SizedBox(width: 8),
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
        ],
      ),
    );
  }

  Widget _buildTrackButton(Job job) {
    return SizedBox(
      width: double.infinity,
      height: 48,
      child: ElevatedButton(
        onPressed: () {
          Navigator.pushNamed(
            context,
            '/job-tracking',
            arguments: job.id,
          );
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
        child: const Text(
          'Track Live',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }

  String _shortId(String id) {
    if (id.length <= 8) return id.toUpperCase();
    return id.substring(0, 8).toUpperCase();
  }
}