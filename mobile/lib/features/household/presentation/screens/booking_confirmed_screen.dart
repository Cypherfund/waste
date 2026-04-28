import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../config/app_theme.dart';
import '../../../../models/job.dart';

class BookingConfirmedScreen extends StatelessWidget {
  final Map<String, dynamic> arguments;

  const BookingConfirmedScreen({
    super.key,
    required this.arguments,
  });

  @override
  Widget build(BuildContext context) {
    final job = arguments['job'] as Job?;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                child: Column(
                  children: [
                    const SizedBox(height: 8),

                    SizedBox(
                      width: double.infinity,
                      height: 105,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          const Positioned.fill(
                            child: CustomPaint(
                              painter: _ConfettiPainter(),
                            ),
                          ),
                          Container(
                            width: 78,
                            height: 78,
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.primary.withValues(alpha: 0.18),
                                  blurRadius: 18,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            child: const Icon(
                              Icons.check_rounded,
                              color: Colors.white,
                              size: 44,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 14),

                    const Text(
                      'Pickup Scheduled!',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF111827),
                        letterSpacing: -0.3,
                      ),
                    ),

                    const SizedBox(height: 8),

                    const Text(
                      "We're finding a collector\nnear you.",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.4,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF6B7280),
                      ),
                    ),

                    const SizedBox(height: 28),

                    if (job != null)
                      _buildBookingDetailsCard(job)
                    else
                      _buildFallbackBookingDetailsCard(),

                    const SizedBox(height: 18),

                    _buildPrimaryButton(
                      label: 'View Booking',
                      onPressed: () {
                        Navigator.pushNamedAndRemoveUntil(
                          context,
                          '/bookings',
                              (route) => route.settings.name == '/home',
                        );
                      },
                    ),

                    const SizedBox(height: 12),

                    _buildSecondaryButton(
                      label: 'Schedule Another',
                      onPressed: () {
                        Navigator.pushNamedAndRemoveUntil(
                          context,
                          '/home',
                              (route) => false,
                        );
                        Navigator.pushNamed(context, '/schedule-pickup');
                      },
                    ),

                    const SizedBox(height: 24),

                    _buildNotificationCard(),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBookingDetailsCard(Job job) {
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
        children: [
          _buildSummaryRow(
            icon: Icons.calendar_today_outlined,
            title: date == null
                ? 'Pickup date'
                : DateFormat('EEE, d MMM yyyy').format(date),
            subtitle: job.scheduledTime,
          ),

          const SizedBox(height: 14),

          _buildSummaryRow(
            icon: Icons.location_on_outlined,
            title: job.locationAddress,
            subtitle: 'Ref: #KTR-${_shortId(job.id)}',
          ),
        ],
      ),
    );
  }

  Widget _buildFallbackBookingDetailsCard() {
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
        children: [
          _buildSummaryRow(
            icon: Icons.calendar_today_outlined,
            title: 'Tue, 21 May 2024',
            subtitle: '8:00 AM – 10:00 AM',
          ),

          const SizedBox(height: 14),

          _buildSummaryRow(
            icon: Icons.location_on_outlined,
            title: 'Bonapriso, Douala',
            subtitle: 'Ref: #KTR-240521-0012',
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 24,
          child: Icon(
            icon,
            size: 18,
            color: const Color(0xFF4B5563),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 12,
                  height: 1.25,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF111827),
                ),
              ),
              const SizedBox(height: 5),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 11,
                  height: 1.25,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF6B7280),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPrimaryButton({
    required String label,
    required VoidCallback onPressed,
  }) {
    return SizedBox(
      width: double.infinity,
      height: 48,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
        onPressed: onPressed,
        child: Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }

  Widget _buildSecondaryButton({
    required String label,
    required VoidCallback onPressed,
  }) {
    return SizedBox(
      width: double.infinity,
      height: 48,
      child: OutlinedButton(
        style: OutlinedButton.styleFrom(
          foregroundColor: const Color(0xFF111827),
          side: const BorderSide(
            color: Color(0xFFE5E7EB),
            width: 1,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
        onPressed: onPressed,
        child: Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }

  Widget _buildNotificationCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F8F3),
        borderRadius: BorderRadius.circular(9),
        border: Border.all(color: const Color(0xFFE2EEE2)),
      ),
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: const Color(0xFFE0F0E0),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.notifications_active_outlined,
              color: AppColors.primary,
              size: 16,
            ),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              "We'll notify you as soon as a\ncollector is assigned.",
              style: TextStyle(
                fontSize: 11,
                height: 1.35,
                fontWeight: FontWeight.w600,
                color: Color(0xFF4B5563),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _shortId(String id) {
    if (id.length <= 8) return id.toUpperCase();
    return id.substring(0, 8).toUpperCase();
  }
}

class _ConfettiPainter extends CustomPainter {
  const _ConfettiPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final pieces = <_ConfettiPiece>[
      _ConfettiPiece(0.05, 0.24, const Color(0xFF2563EB), math.pi / 5),
      _ConfettiPiece(0.16, 0.08, const Color(0xFFF59E0B), math.pi / 3),
      _ConfettiPiece(0.28, 0.32, const Color(0xFF16A34A), math.pi / 7),
      _ConfettiPiece(0.40, 0.10, const Color(0xFFEF4444), math.pi / 6),
      _ConfettiPiece(0.58, 0.16, const Color(0xFF2563EB), math.pi / 4),
      _ConfettiPiece(0.72, 0.08, const Color(0xFFF59E0B), math.pi / 9),
      _ConfettiPiece(0.86, 0.25, const Color(0xFF16A34A), math.pi / 5),
      _ConfettiPiece(0.96, 0.12, const Color(0xFFEF4444), math.pi / 3),
      _ConfettiPiece(0.10, 0.58, const Color(0xFFF59E0B), math.pi / 4),
      _ConfettiPiece(0.23, 0.72, const Color(0xFF16A34A), math.pi / 8),
      _ConfettiPiece(0.78, 0.68, const Color(0xFF2563EB), math.pi / 6),
      _ConfettiPiece(0.92, 0.55, const Color(0xFFEF4444), math.pi / 7),
      _ConfettiPiece(0.36, 0.82, const Color(0xFF2563EB), math.pi / 3),
      _ConfettiPiece(0.62, 0.82, const Color(0xFFF59E0B), math.pi / 4),
    ];

    for (final piece in pieces) {
      final paint = Paint()
        ..color = piece.color
        ..style = PaintingStyle.fill;

      final center = Offset(size.width * piece.dx, size.height * piece.dy);

      canvas.save();
      canvas.translate(center.dx, center.dy);
      canvas.rotate(piece.rotation);
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          const Rect.fromLTWH(-2, -2, 4, 4),
          const Radius.circular(1),
        ),
        paint,
      );
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(covariant _ConfettiPainter oldDelegate) => false;
}

class _ConfettiPiece {
  final double dx;
  final double dy;
  final Color color;
  final double rotation;

  const _ConfettiPiece(
      this.dx,
      this.dy,
      this.color,
      this.rotation,
      );
}