import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../config/app_theme.dart';
import '../../../../providers/job_provider.dart';
import '../../../../providers/subscription_provider.dart';
import '../../../../models/subscription.dart';
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
  String _selectedPaymentMethod = 'MOBILE_MONEY';
  final _paymentRefController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SubscriptionProvider>().loadPricingQuote();
    });
  }

  @override
  void dispose() {
    _paymentRefController.dispose();
    super.dispose();
  }

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

    final subProvider = context.watch<SubscriptionProvider>();
    final quote = subProvider.pricingQuote;
    final isFree = quote?.isCoveredBySubscription == true;
    final totalPrice = quote?.quotedPrice ?? 1000.0;

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

                    _buildPricingBanner(quote),

                    const SizedBox(height: 22),

                    if (!isFree) _buildPaymentSection(subProvider, totalPrice),
                  ],
                ),
              ),
            ),

            _buildConfirmButton(
              totalPrice: totalPrice,
              isFree: isFree,
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

  Widget _buildPricingBanner(PricingQuote? quote) {
    if (quote == null) {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFF9FAFB),
          borderRadius: BorderRadius.circular(9),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: const Center(
          child: SizedBox(
            height: 18,
            width: 18,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      );
    }

    if (quote.isCoveredBySubscription) {
      // Case 1: FREE — covered by subscription
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFEAF5EA),
          borderRadius: BorderRadius.circular(9),
          border: Border.all(color: AppColors.primary),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.check_circle_rounded,
                    color: AppColors.primary, size: 18),
                const SizedBox(width: 8),
                Text(
                  'This pickup is FREE 🎉',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'Covered by your ${quote.planName ?? 'subscription'}',
              style: const TextStyle(
                fontSize: 11,
                color: Color(0xFF374151),
                fontWeight: FontWeight.w500,
              ),
            ),
            if (quote.remainingPickupsThisWeek != null) ...
              [
                const SizedBox(height: 4),
                Text(
                  'Pickups remaining this week: ${quote.remainingPickupsThisWeek}',
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF6B7280),
                  ),
                ),
              ],
          ],
        ),
      );
    }

    if (quote.planName != null && quote.remainingPickupsThisWeek == 0) {
      // Case 2: Subscription exhausted
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF8E1),
          borderRadius: BorderRadius.circular(9),
          border: Border.all(color: const Color(0xFFFFA000)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.warning_amber_rounded,
                    color: Color(0xFFFFA000), size: 18),
                SizedBox(width: 8),
                Text(
                  'Weekly pickups used up',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF111827),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            _buildPriceRow(
              'This pickup costs',
              quote.quotedPrice,
              isTotal: true,
            ),
            const SizedBox(height: 10),
            GestureDetector(
              onTap: () => Navigator.pushNamed(context, '/subscription-plans'),
              child: Text(
                'Upgrade your plan →',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ],
        ),
      );
    }

    // Case 3: No subscription — pay per pickup
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(9),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Price',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: Color(0xFF111827),
            ),
          ),
          const SizedBox(height: 10),
          _buildPriceRow('This pickup', quote.quotedPrice, isTotal: true),
          if (quote.subscriptionSavingsMessage != null) ...
            [
              const SizedBox(height: 12),
              const Divider(height: 1, color: Color(0xFFE5E7EB)),
              const SizedBox(height: 12),
              GestureDetector(
                onTap: () =>
                    Navigator.pushNamed(context, '/subscription-plans'),
                child: Row(
                  children: [
                    const Icon(Icons.savings_outlined,
                        size: 14, color: Color(0xFF2E7D32)),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        quote.subscriptionSavingsMessage!,
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF2E7D32),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded,
                        size: 16, color: Color(0xFF2E7D32)),
                  ],
                ),
              ),
            ],
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

  Widget _buildPaymentSection(SubscriptionProvider subProvider, double amount) {
    final appConfig = subProvider.appConfig;
    final paymentEnabled = appConfig?.paymentIntegrationEnabled ?? false;

    if (paymentEnabled) {
      return _buildOnlinePaymentMethod();
    }
    return _buildManualPaymentFlow(appConfig, amount);
  }

  Widget _buildOnlinePaymentMethod() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Pay with',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            color: Color(0xFF111827),
          ),
        ),
        const SizedBox(height: 10),
        Container(
          width: double.infinity,
          height: 50,
          padding: const EdgeInsets.symmetric(horizontal: 13),
          decoration: BoxDecoration(
            color: const Color(0xFFEAF5EA),
            borderRadius: BorderRadius.circular(9),
            border: Border.all(color: AppColors.primary, width: 1.3),
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
                child: const Icon(
                  Icons.account_balance_wallet_outlined,
                  color: Color(0xFF374151),
                  size: 17,
                ),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Mobile Money / Card',
                  style: TextStyle(
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
                child: const Icon(Icons.check_rounded, size: 12, color: Colors.white),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildManualPaymentFlow(dynamic appConfig, double amount) {
    final instructions = (appConfig?.manualPaymentInstructions as String? ?? '')
        .replaceAll('{amount}', amount.toStringAsFixed(0));
    final whatsapp = appConfig?.supportWhatsapp as String? ?? '';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Payment method selector
        const Text(
          'Payment Method',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            color: Color(0xFF111827),
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            _buildMethodChip('MOBILE_MONEY', Icons.phone_android, 'Mobile Money'),
            const SizedBox(width: 10),
            _buildMethodChip('BANK_TRANSFER', Icons.account_balance, 'Bank Transfer'),
          ],
        ),
        const SizedBox(height: 16),

        // Instructions box
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFFFF8E1),
            borderRadius: BorderRadius.circular(9),
            border: Border.all(color: const Color(0xFFFFA000)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.info_outline_rounded,
                      color: Color(0xFFFFA000), size: 16),
                  SizedBox(width: 6),
                  Text(
                    'How to pay',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF111827),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                instructions.isNotEmpty
                    ? instructions
                    : 'Send your payment of ${amount.toStringAsFixed(0)} XAF via Mobile Money. An admin will confirm your payment shortly.',
                style: const TextStyle(
                  fontSize: 11,
                  height: 1.5,
                  color: Color(0xFF374151),
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 10),
              GestureDetector(
                onTap: () {
                  Clipboard.setData(ClipboardData(
                    text: amount.toStringAsFixed(0),
                  ));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Amount copied to clipboard'),
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.copy_rounded,
                        size: 13, color: Color(0xFFFFA000)),
                    const SizedBox(width: 4),
                    Text(
                      'Copy amount: ${amount.toStringAsFixed(0)} XAF',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFFFFA000),
                        decoration: TextDecoration.underline,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Payment reference field
        const Text(
          'Payment Reference / Transaction ID',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            color: Color(0xFF111827),
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _paymentRefController,
          style: const TextStyle(fontSize: 12),
          decoration: InputDecoration(
            hintText: 'e.g. 0012345678 or leave blank',
            hintStyle: const TextStyle(
                fontSize: 11, color: Color(0xFF9CA3AF)),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(9),
              borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(9),
              borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(9),
              borderSide: BorderSide(color: AppColors.primary, width: 1.3),
            ),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          'Optional — enter your MoMo transaction ID so the admin can verify quickly.',
          style: TextStyle(
              fontSize: 10, color: Color(0xFF9CA3AF), height: 1.4),
        ),
        const SizedBox(height: 16),

        // WhatsApp support
        if (whatsapp.isNotEmpty)
          GestureDetector(
            onTap: () => _openWhatsApp(whatsapp),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFDCFCE7),
                borderRadius: BorderRadius.circular(9),
                border: Border.all(color: const Color(0xFF16A34A)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.chat_rounded,
                      color: Color(0xFF16A34A), size: 18),
                  SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Need help? Chat with us on WhatsApp',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF14532D),
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Tap to open WhatsApp for complaints or payment issues',
                          style: TextStyle(
                            fontSize: 10,
                            color: Color(0xFF166534),
                            height: 1.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.arrow_forward_ios_rounded,
                      size: 12, color: Color(0xFF16A34A)),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildMethodChip(String key, IconData icon, String label) {
    final isSelected = _selectedPaymentMethod == key;
    return GestureDetector(
      onTap: () => setState(() => _selectedPaymentMethod = key),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFEAF5EA) : const Color(0xFFF9FAFB),
          borderRadius: BorderRadius.circular(9),
          border: Border.all(
            color: isSelected ? AppColors.primary : const Color(0xFFE5E7EB),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon,
                size: 15,
                color: isSelected ? AppColors.primary : const Color(0xFF6B7280)),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: isSelected
                    ? AppColors.primary
                    : const Color(0xFF374151),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openWhatsApp(String phone) async {
    final clean = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    final url = Uri.parse('https://wa.me/$clean');
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open WhatsApp')),
        );
      }
    }
  }

  Widget _buildConfirmButton({
    required double totalPrice,
    required bool isFree,
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
                  isFree: isFree,
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
                    : Text(
                  isFree ? 'Confirm Booking' : 'Confirm & Pay',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 13),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.lock_outline_rounded,
                  size: 12,
                  color: Color(0xFF9CA3AF),
                ),
                const SizedBox(width: 5),
                Text(
                  isFree ? 'No payment required' : 'Payment verified by admin',
                  style: const TextStyle(
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
    required bool isFree,
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

      final paymentRef = _paymentRefController.text.trim();
      final paymentNote = isFree
          ? ''
          : ' | Payment: $_selectedPaymentMethod'
              '${paymentRef.isNotEmpty ? ' | Ref: $paymentRef' : ''}';

      final job = await jobProvider.createJob(
        scheduledDate: scheduledDate,
        scheduledTime: scheduledTime,
        locationAddress: fullAddress,
        locationLat: locationLat,
        locationLng: locationLng,
        notes: 'Pickup type: ${_getPickupTypeName(pickupType)}$paymentNote',
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