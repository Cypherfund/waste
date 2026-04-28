import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../../../config/app_theme.dart';
import '../../../../providers/job_provider.dart';
import 'schedule_pickup_type_screen.dart';

class ScheduleReviewPaymentScreen extends StatefulWidget {
  final Map<String, dynamic> arguments;

  const ScheduleReviewPaymentScreen({
    super.key,
    required this.arguments,
  });

  @override
  State<ScheduleReviewPaymentScreen> createState() =>
      _ScheduleReviewPaymentScreenState();
}

class _ScheduleReviewPaymentScreenState
    extends State<ScheduleReviewPaymentScreen> {
  bool _isCreatingJob = false;

  final double _basePrice = 1500.0;
  final double _distancePrice = 500.0;
  final double _walletBalance = 5600.0;

  String _getPickupTypeName(PickupScheduleType type) {
    switch (type) {
      case PickupScheduleType.oneTime:
        return 'One-time pickup';
      case PickupScheduleType.weekly:
        return 'Weekly pickup';
      case PickupScheduleType.custom:
        return 'Custom schedule';
    }
  }

  String _getWasteTypeLabel(PickupScheduleType type) {
    switch (type) {
      case PickupScheduleType.oneTime:
        return 'General Waste';
      case PickupScheduleType.weekly:
        return 'General Waste';
      case PickupScheduleType.custom:
        return 'General Waste';
    }
  }

  @override
  Widget build(BuildContext context) {
    final pickupType = widget.arguments['pickupType'] as PickupScheduleType;
    final scheduledDate = widget.arguments['scheduledDate'] as DateTime;
    final scheduledTime = widget.arguments['scheduledTime'] as String;
    final locationAddress =
        widget.arguments['locationAddress'] as String? ?? 'Bonapriso, Douala';
    final locationArea =
        widget.arguments['locationArea'] as String? ?? 'Near Total Bonapriso';
    final landmark = widget.arguments['landmark'] as String?;
    final locationLat = widget.arguments['locationLat'] as double?;
    final locationLng = widget.arguments['locationLng'] as double?;

    final totalPrice = _basePrice + _distancePrice;

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
          onPressed: _isCreatingJob ? null : () => Navigator.pop(context),
        ),
        title: const Text(
          'Review your booking',
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
        child: Column(
          children: [
            const Divider(
              height: 1,
              thickness: 1,
              color: Color(0xFFF0F2F0),
            ),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildInfoRow(
                      icon: Icons.calendar_today_outlined,
                      title: 'Date & Time',
                      lines: [
                        DateFormat('EEE, d MMM yyyy').format(scheduledDate),
                        scheduledTime,
                      ],
                    ),

                    const SizedBox(height: 18),

                    _buildInfoRow(
                      icon: Icons.location_on_outlined,
                      title: 'Address',
                      lines: [
                        locationAddress,
                        locationArea,
                      ],
                    ),

                    const SizedBox(height: 18),

                    _buildInfoRow(
                      icon: Icons.delete_outline_rounded,
                      title: 'Waste Type',
                      lines: [
                        _getWasteTypeLabel(pickupType),
                      ],
                    ),

                    const SizedBox(height: 18),

                    _buildInfoRow(
                      icon: Icons.note_alt_outlined,
                      title: 'Notes',
                      lines: [
                        landmark != null && landmark.trim().isNotEmpty
                            ? landmark
                            : 'No instructions',
                      ],
                    ),

                    const SizedBox(height: 22),

                    _buildPriceBreakdown(
                      basePrice: _basePrice,
                      distancePrice: _distancePrice,
                      totalPrice: totalPrice,
                    ),

                    const SizedBox(height: 22),

                    _buildPaymentMethod(),
                  ],
                ),
              ),
            ),

            _buildConfirmButton(
              totalPrice: totalPrice,
              pickupType: pickupType,
              scheduledDate: scheduledDate,
              scheduledTime: scheduledTime,
              locationAddress: locationAddress,
              landmark: landmark,
              locationLat: locationLat,
              locationLng: locationLng,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String title,
    required List<String> lines,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 34,
          child: Icon(
            icon,
            size: 26,
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
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF111827),
                ),
              ),
              const SizedBox(height: 6),
              ...lines.map(
                    (line) => Padding(
                  padding: const EdgeInsets.only(bottom: 3),
                  child: Text(
                    line,
                    style: const TextStyle(
                      fontSize: 11,
                      height: 1.25,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPriceBreakdown({
    required double basePrice,
    required double distancePrice,
    required double totalPrice,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(9),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Price breakdown',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: Color(0xFF111827),
            ),
          ),
          const SizedBox(height: 13),
          _buildPriceRow('Base price', basePrice),
          const SizedBox(height: 9),
          _buildPriceRow('Distance fee', distancePrice),
          const SizedBox(height: 12),
          const Divider(
            height: 1,
            thickness: 1,
            color: Color(0xFFE5E7EB),
          ),
          const SizedBox(height: 12),
          _buildPriceRow(
            'Total',
            totalPrice,
            isTotal: true,
          ),
        ],
      ),
    );
  }

  Widget _buildPriceRow(
      String label,
      double amount, {
        bool isTotal = false,
      }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isTotal ? 12 : 11,
            fontWeight: isTotal ? FontWeight.w900 : FontWeight.w500,
            color: isTotal ? const Color(0xFF111827) : const Color(0xFF6B7280),
          ),
        ),
        Text(
          '${amount.toStringAsFixed(0)} XAF',
          style: TextStyle(
            fontSize: isTotal ? 12 : 11,
            fontWeight: isTotal ? FontWeight.w900 : FontWeight.w700,
            color: const Color(0xFF111827),
          ),
        ),
      ],
    );
  }

  Widget _buildPaymentMethod() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text(
              'Pay with',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: Color(0xFF111827),
              ),
            ),
            const Spacer(),
            GestureDetector(
              onTap: () {},
              child: Text(
                'Change',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Container(
          width: double.infinity,
          height: 50,
          padding: const EdgeInsets.symmetric(horizontal: 13),
          decoration: BoxDecoration(
            color: const Color(0xFFEAF5EA),
            borderRadius: BorderRadius.circular(9),
            border: Border.all(
              color: AppColors.primary,
              width: 1.3,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: const Color(0xFFD8EBDD),
                  borderRadius: BorderRadius.circular(7),
                ),
                child: Icon(
                  Icons.account_balance_wallet_outlined,
                  color: const Color(0xFF374151),
                  size: 17,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Wallet (Balance: ${_walletBalance.toStringAsFixed(0)} XAF)',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF111827),
                  ),
                ),
              ),
              Container(
                width: 18,
                height: 18,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_rounded,
                  size: 12,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildConfirmButton({
    required double totalPrice,
    required PickupScheduleType pickupType,
    required DateTime scheduledDate,
    required String scheduledTime,
    required String locationAddress,
    String? landmark,
    double? locationLat,
    double? locationLng,
  }) {
    return Container(
      width: double.infinity,
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: AppColors.primary.withValues(
                    alpha: 0.55,
                  ),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(9),
                  ),
                ),
                onPressed: _isCreatingJob
                    ? null
                    : () => _confirmBooking(
                  scheduledDate: scheduledDate,
                  scheduledTime: scheduledTime,
                  locationAddress: locationAddress,
                  landmark: landmark,
                  locationLat: locationLat,
                  locationLng: locationLng,
                ),
                child: _isCreatingJob
                    ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.2,
                    color: Colors.white,
                  ),
                )
                    : const Text(
                  'Confirm & Pay',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 13),
            const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.lock_outline_rounded,
                  size: 12,
                  color: Color(0xFF9CA3AF),
                ),
                SizedBox(width: 5),
                Text(
                  'Payments are secure',
                  style: TextStyle(
                    fontSize: 10,
                    color: Color(0xFF9CA3AF),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmBooking({
    required DateTime scheduledDate,
    required String scheduledTime,
    required String locationAddress,
    String? landmark,
    double? locationLat,
    double? locationLng,
  }) async {
    setState(() {
      _isCreatingJob = true;
    });

    try {
      final jobProvider = context.read<JobProvider>();

      final fullAddress = landmark != null && landmark.trim().isNotEmpty
          ? '$locationAddress (Near: $landmark)'
          : locationAddress;

      final pickupType =
      widget.arguments['pickupType'] as PickupScheduleType;

      final job = await jobProvider.createJob(
        scheduledDate: scheduledDate,
        scheduledTime: scheduledTime,
        locationAddress: fullAddress,
        locationLat: locationLat,
        locationLng: locationLng,
        notes: 'Pickup type: ${_getPickupTypeName(pickupType)}',
      );

      if (job != null && mounted) {
        Navigator.pushNamedAndRemoveUntil(
          context,
          '/booking-confirmed',
              (route) => route.settings.name == '/home',
          arguments: {
            'jobId': job.id,
            'job': job,
          },
        );
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(jobProvider.error ?? 'Failed to create booking'),
            backgroundColor: Colors.red.shade600,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('An error occurred. Please try again.'),
            backgroundColor: Colors.red.shade600,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isCreatingJob = false;
        });
      }
    }
  }
}