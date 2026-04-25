import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../../config/app_theme.dart';
import '../../../../providers/job_provider.dart';
import '../screens/schedule_pickup_type_screen.dart';

class ScheduleReviewPaymentScreen extends StatefulWidget {
  final Map<String, dynamic> arguments;

  const ScheduleReviewPaymentScreen({
    super.key,
    required this.arguments,
  });

  @override
  State<ScheduleReviewPaymentScreen> createState() => _ScheduleReviewPaymentScreenState();
}

class _ScheduleReviewPaymentScreenState extends State<ScheduleReviewPaymentScreen> {
  bool _isCreatingJob = false;
  
  // Pricing simulation - in production, this would come from API
  final double _basePrice = 2000.0; // XAF
  final double _distancePrice = 500.0; // XAF
  
  String _getPickupTypeName(PickupType type) {
    switch (type) {
      case PickupType.regular:
        return 'Regular Waste';
      case PickupType.recyclable:
        return 'Recyclable';
      case PickupType.hazardous:
        return 'Hazardous';
      case PickupType.bulk:
        return 'Bulk Items';
    }
  }

  IconData _getPickupTypeIcon(PickupType type) {
    switch (type) {
      case PickupType.regular:
        return Icons.delete_outline;
      case PickupType.recyclable:
        return Icons.recycling;
      case PickupType.hazardous:
        return Icons.warning_amber_rounded;
      case PickupType.bulk:
        return Icons.king_bed_outlined;
    }
  }

  Color _getPickupTypeColor(PickupType type) {
    switch (type) {
      case PickupType.regular:
        return AppColors.primary;
      case PickupType.recyclable:
        return Colors.blue;
      case PickupType.hazardous:
        return Colors.orange;
      case PickupType.bulk:
        return Colors.purple;
    }
  }

  @override
  Widget build(BuildContext context) {
    final pickupType = widget.arguments['pickupType'] as PickupType;
    final scheduledDate = widget.arguments['scheduledDate'] as DateTime;
    final scheduledTime = widget.arguments['scheduledTime'] as String;
    final locationAddress = widget.arguments['locationAddress'] as String;
    final landmark = widget.arguments['landmark'] as String?;
    final locationLat = widget.arguments['locationLat'] as double?;
    final locationLng = widget.arguments['locationLng'] as double?;
    
    final totalPrice = _basePrice + _distancePrice;
    
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7F4),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: _isCreatingJob ? null : () => Navigator.pop(context),
        ),
        title: const Text(
          'Review & Payment',
          style: TextStyle(
            color: Colors.black,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Progress Indicator
          _buildProgressIndicator(),
          
          // Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Review your booking',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Please review the details before confirming',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.grey.shade600,
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // Booking Details
                  _buildBookingDetails(
                    pickupType: pickupType,
                    scheduledDate: scheduledDate,
                    scheduledTime: scheduledTime,
                    locationAddress: locationAddress,
                    landmark: landmark,
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Price Breakdown
                  _buildPriceBreakdown(
                    basePrice: _basePrice,
                    distancePrice: _distancePrice,
                    totalPrice: totalPrice,
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Payment Method
                  _buildPaymentMethod(),
                ],
              ),
            ),
          ),
          
          // Confirm Button
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
    );
  }

  Widget _buildProgressIndicator() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Row(
        children: [
          _buildProgressStep(1, 'Type', false, true),
          _buildProgressLine(true),
          _buildProgressStep(2, 'Schedule', false, true),
          _buildProgressLine(true),
          _buildProgressStep(3, 'Location', false, true),
          _buildProgressLine(true),
          _buildProgressStep(4, 'Review', true, false),
        ],
      ),
    );
  }

  Widget _buildProgressStep(int step, String label, bool isActive, bool isCompleted) {
    return Expanded(
      child: Column(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isActive || isCompleted
                  ? AppColors.primary
                  : Colors.grey.shade300,
            ),
            child: Center(
              child: isCompleted
                  ? const Icon(Icons.check, color: Colors.white, size: 16)
                  : Text(
                      step.toString(),
                      style: TextStyle(
                        color: isActive ? Colors.white : Colors.grey.shade600,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: isActive ? AppColors.primary : Colors.grey.shade500,
              fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressLine(bool isCompleted) {
    return Expanded(
      child: Container(
        height: 2,
        color: isCompleted ? AppColors.primary : Colors.grey.shade300,
        margin: const EdgeInsets.only(bottom: 20),
      ),
    );
  }

  Widget _buildBookingDetails({
    required PickupType pickupType,
    required DateTime scheduledDate,
    required String scheduledTime,
    required String locationAddress,
    String? landmark,
  }) {
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
          // Pickup Type
          _buildDetailRow(
            icon: _getPickupTypeIcon(pickupType),
            iconColor: _getPickupTypeColor(pickupType),
            title: 'Waste Type',
            value: _getPickupTypeName(pickupType),
          ),
          const Divider(height: 32),
          
          // Date & Time
          _buildDetailRow(
            icon: Icons.calendar_today,
            iconColor: AppColors.primary,
            title: 'Date & Time',
            value: '${DateFormat('EEEE, d MMM').format(scheduledDate)}\n$scheduledTime',
          ),
          const Divider(height: 32),
          
          // Location
          _buildDetailRow(
            icon: Icons.location_on,
            iconColor: AppColors.primary,
            title: 'Pickup Location',
            value: landmark != null && landmark.isNotEmpty
                ? '$locationAddress\n(Near: $landmark)'
                : locationAddress,
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String value,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            icon,
            color: iconColor,
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
                  fontSize: 14,
                  color: Colors.grey.shade600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                  height: 1.4,
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
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.primaryLight.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.primaryLight.withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.receipt_outlined,
                color: AppColors.primary,
                size: 20,
              ),
              const SizedBox(width: 8),
              const Text(
                'Price Details',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildPriceRow('Base rate', basePrice),
          const SizedBox(height: 8),
          _buildPriceRow('Distance fee', distancePrice),
          const Divider(height: 24),
          _buildPriceRow(
            'Total',
            totalPrice,
            isTotal: true,
          ),
        ],
      ),
    );
  }

  Widget _buildPriceRow(String label, double amount, {bool isTotal = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isTotal ? 16 : 14,
            fontWeight: isTotal ? FontWeight.w600 : FontWeight.normal,
            color: isTotal ? Colors.black87 : Colors.grey.shade700,
          ),
        ),
        Text(
          '${amount.toStringAsFixed(0)} XAF',
          style: TextStyle(
            fontSize: isTotal ? 18 : 14,
            fontWeight: isTotal ? FontWeight.bold : FontWeight.w600,
            color: isTotal ? AppColors.primary : Colors.black87,
          ),
        ),
      ],
    );
  }

  Widget _buildPaymentMethod() {
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
                Icons.account_balance_wallet_outlined,
                color: AppColors.primary,
                size: 20,
              ),
              const SizedBox(width: 8),
              const Text(
                'Payment Method',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.primary),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.money,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Cash Payment',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Pay directly to the collector',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check,
                    color: Colors.white,
                    size: 16,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildConfirmButton({
    required double totalPrice,
    required PickupType pickupType,
    required DateTime scheduledDate,
    required String scheduledTime,
    required String locationAddress,
    String? landmark,
    double? locationLat,
    double? locationLng,
  }) {
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
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Total Amount',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.grey,
                  ),
                ),
                Text(
                  '${totalPrice.toStringAsFixed(0)} XAF',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
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
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'Confirm Booking',
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
      final fullAddress = landmark != null && landmark.isNotEmpty
          ? '$locationAddress (Near: $landmark)'
          : locationAddress;
          
      final job = await jobProvider.createJob(
        scheduledDate: scheduledDate,
        scheduledTime: scheduledTime,
        locationAddress: fullAddress,
        locationLat: locationLat,
        locationLng: locationLng,
        notes: 'Pickup type: ${_getPickupTypeName(widget.arguments['pickupType'] as PickupType)}',
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
    } catch (e) {
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
