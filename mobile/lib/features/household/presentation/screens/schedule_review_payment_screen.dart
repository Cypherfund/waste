import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../config/app_theme.dart';
import '../../../../providers/job_provider.dart';
import '../../../../providers/subscription_provider.dart';
import '../../../../providers/user_payment_methods_provider.dart';
import '../../../../models/subscription.dart';
import '../../../../services/api/wallet_api.dart';
import '../../../../services/api/files_api.dart';
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
  // 'CASH' | provider paymentCode | null (nothing selected)
  String? _selectedPaymentMethod;
  PickupScheduleType _pickupType = PickupScheduleType.oneTime;
  final _paymentRefController = TextEditingController();
  XFile? _paymentProofImage;
  bool _isUploadingProof = false;
  String? _uploadedProofUrl;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SubscriptionProvider>().loadPricingQuote();
      context.read<SubscriptionProvider>().loadPlans();
      context.read<UserPaymentMethodsProvider>().loadMethods(usage: 'CASHIN');
    });
  }

  @override
  void dispose() {
    _paymentRefController.dispose();
    super.dispose();
  }

  // Derive paymentMode string from selection
  String _resolvePaymentMode(bool isFree) {
    if (isFree) return 'NONE';
    if (_selectedPaymentMethod == 'CASH') return 'CASH';
    if (_selectedPaymentMethod != null) return 'MANUAL_PROVIDER';
    return 'NONE';
  }

  String _getPickupTypeName(PickupScheduleType type) {
    switch (type) {
      case PickupScheduleType.oneTime:
        return 'One-time pickup';
      case PickupScheduleType.monthly:
        return 'Monthly subscription';
      case PickupScheduleType.custom:
        return 'Custom schedule';
    }
  }

  String _getWasteTypeLabel(PickupScheduleType type) {
    switch (type) {
      case PickupScheduleType.oneTime:
        return 'General Waste';
      case PickupScheduleType.monthly:
        return 'General Waste';
      case PickupScheduleType.custom:
        return 'General Waste';
    }
  }

  @override
  Widget build(BuildContext context) {
    final pickupTypeString = widget.arguments['pickupType'] as String? ?? 'oneTime';
    final pickupType = pickupTypeString == 'monthly'
        ? PickupScheduleType.monthly
        : PickupScheduleType.oneTime;
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

                    _buildPricingBanner(quote, subProvider),

                    const SizedBox(height: 22),

                    _buildPickupTypeSelection(),

                    const SizedBox(height: 22),

                    if (!isFree) _buildPaymentSection(subProvider, totalPrice, pickupType),
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

  Widget _buildPricingBanner(PricingQuote? quote, SubscriptionProvider subProvider) {
    if (quote == null) {
      final isLoading = subProvider.isLoading;

      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isLoading ? const Color(0xFFF9FAFB) : const Color(0xFFFFF8E1),
          borderRadius: BorderRadius.circular(9),
          border: Border.all(
            color: isLoading ? const Color(0xFFE5E7EB) : const Color(0xFFFFA000),
          ),
        ),
        child: Row(
          children: [
            Icon(
              isLoading ? Icons.sync_rounded : Icons.wifi_off_rounded,
              color: isLoading ? const Color(0xFF6B7280) : const Color(0xFFFFA000),
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isLoading ? 'Loading pricing...' : 'Could not load pricing',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF111827),
                    ),
                  ),
                  if (!isLoading) ...[
                    const SizedBox(height: 4),
                    const Text(
                      'Check your connection and try again.',
                      style: TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                    ),
                  ],
                ],
              ),
            ),
            if (!isLoading) ...[
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () => subProvider.loadPricingQuote(),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFA000),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    'Retry',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ],
          ],
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
                  'Subscription pickups used up',
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

  Widget _buildPickupTypeSelection() {
    return Consumer<SubscriptionProvider>(
      builder: (context, subProvider, _) {
        final quote = subProvider.pricingQuote;
        final hasActiveSubscription = subProvider.hasActiveSubscription && 
                                     (subProvider.subscription?.remainingPickupsThisWeek ?? 0) > 0;
        
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Pickup Type',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: Color(0xFF111827),
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _pickupType = PickupScheduleType.oneTime),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _pickupType == PickupScheduleType.oneTime
                            ? AppColors.primary.withValues(alpha: 0.1)
                            : const Color(0xFFF9FAFB),
                        borderRadius: BorderRadius.circular(9),
                        border: Border.all(
                          color: _pickupType == PickupScheduleType.oneTime
                              ? AppColors.primary
                              : const Color(0xFFE5E7EB),
                        ),
                      ),
                      child: Column(
                        children: [
                          Icon(
                            Icons.local_shipping_outlined,
                            color: _pickupType == PickupScheduleType.oneTime
                                ? AppColors.primary
                                : const Color(0xFF6B7280),
                            size: 20,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'One-time Pickup',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: _pickupType == PickupScheduleType.oneTime
                                  ? AppColors.primary
                                  : const Color(0xFF374151),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${quote?.perPickupPrice?.toStringAsFixed(0) ?? '1000'} XAF',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: _pickupType == PickupScheduleType.oneTime
                                  ? AppColors.primary
                                  : const Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _pickupType = PickupScheduleType.monthly),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _pickupType == PickupScheduleType.monthly
                            ? AppColors.primary.withValues(alpha: 0.1)
                            : const Color(0xFFF9FAFB),
                        borderRadius: BorderRadius.circular(9),
                        border: Border.all(
                          color: _pickupType == PickupScheduleType.monthly
                              ? AppColors.primary
                              : const Color(0xFFE5E7EB),
                        ),
                      ),
                      child: Column(
                        children: [
                          Icon(
                            Icons.repeat_outlined,
                            color: _pickupType == PickupScheduleType.monthly
                                ? AppColors.primary
                                : const Color(0xFF6B7280),
                            size: 20,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Monthly Subscription',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: _pickupType == PickupScheduleType.monthly
                                  ? AppColors.primary
                                  : const Color(0xFF374151),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            (() {
                              final price = quote?.subscriptionPrice;
                              return price != null 
                                  ? '${price.toStringAsFixed(0)} XAF/month'
                                  : 'Contact for pricing';
                            })(),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: _pickupType == PickupScheduleType.monthly
                                  ? AppColors.primary
                                  : const Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            if (hasActiveSubscription && _pickupType == PickupScheduleType.monthly) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFDCFCE7),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_outline, 
                        color: Color(0xFF16A34A), size: 16),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'You have an active subscription with ${subProvider.subscription?.remainingPickupsThisWeek ?? 0} pickups remaining this week',
                        style: const TextStyle(
                          fontSize: 10,
                          color: Color(0xFF16A34A),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        );
      },
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

  Widget _buildPaymentSection(SubscriptionProvider subProvider, double amount, PickupScheduleType pickupType) {
    final appConfig = subProvider.appConfig;
    final paymentEnabled = appConfig?.paymentIntegrationEnabled ?? false;

    // Calculate correct amount based on pickup type
    double displayAmount = amount;
    if (pickupType == PickupScheduleType.monthly) {
      // Use the subscription price from the pricing quote if available
      final subscriptionPrice = subProvider.pricingQuote?.subscriptionPrice;
      if (subscriptionPrice != null) {
        displayAmount = subscriptionPrice;
      }
    }

    if (paymentEnabled) {
      return _buildOnlinePaymentMethod();
    }
    return _buildManualPaymentFlow(subProvider);
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

  Widget _buildManualPaymentFlow(SubscriptionProvider subProvider) {
    final appConfig = subProvider.appConfig;
    final whatsapp = appConfig?.supportWhatsapp ?? '';
    final cashEnabled = appConfig?.cashEnabled ?? false;

    return Consumer<UserPaymentMethodsProvider>(
      builder: (context, paymentMethodsProvider, _) {
        final cashinMethods = paymentMethodsProvider.cashinMethods;

        // Auto-select default method if none selected yet
        if (_selectedPaymentMethod == null && cashinMethods.isNotEmpty) {
          _selectedPaymentMethod = paymentMethodsProvider.defaultCashinMethod?.id ?? cashinMethods.first.id;
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Payment method selector
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Payment Method',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF111827),
                  ),
                ),
                TextButton(
                  onPressed: () {
                    Navigator.pushNamed(
                      context,
                      '/payment-methods-setup',
                      arguments: {'mode': 'cashin'},
                    );
                  },
                  child: const Text('Manage methods'),
                ),
              ],
            ),
            const SizedBox(height: 10),
            // Empty state: no payment methods saved
            if (paymentMethodsProvider.loading)
              const Center(child: CircularProgressIndicator())
            else if (cashinMethods.isEmpty && !cashEnabled)
              Column(
                children: [
                  Text(
                    'No payment methods saved.',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: () {
                      Navigator.pushNamed(
                        context,
                        '/payment-methods-setup',
                        arguments: {'mode': 'cashin'},
                      );
                    },
                    icon: const Icon(Icons.add, size: 14),
                    label: const Text('Add payment method'),
                  ),
                ],
              )
            else
              Wrap(
                spacing: 10,
                runSpacing: 8,
                children: [
                  ...cashinMethods.map((m) =>
                      _buildMethodChip(m.id, Icons.phone_android, m.providerName)),
                  if (cashEnabled)
                    _buildMethodChip('CASH', Icons.payments_outlined, 'Cash'),
                ],
              ),
            const SizedBox(height: 16),

            // Cash selected: pay-at-pickup note
            if (_selectedPaymentMethod == 'CASH') ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFEAF5EA),
                  borderRadius: BorderRadius.circular(9),
                  border: Border.all(color: AppColors.primary, width: 1.5),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline_rounded,
                        color: AppColors.primary, size: 18),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Text(
                        'Your collector will collect cash payment at pickup time. No reference needed.',
                        style: TextStyle(
                          fontSize: 11,
                          color: Color(0xFF14532D),
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
            ],

            // Saved method selected: show its details card
            if (_selectedPaymentMethod != null && _selectedPaymentMethod != 'CASH') ...[
              () {
                final sel = cashinMethods.where((m) => m.id == _selectedPaymentMethod).toList();
                if (sel.isEmpty) return const SizedBox.shrink();
                return _buildSavedMethodCard(sel.first);
              }(),
              const SizedBox(height: 14),

              // Payment reference (required for manual providers)
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
                  hintText: 'e.g. 0012345678',
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
                'Enter your MoMo transaction ID so the admin can verify quickly.',
                style: TextStyle(
                    fontSize: 10, color: Color(0xFF9CA3AF), height: 1.4),
              ),
              const SizedBox(height: 14),

              // Proof upload (shown if provider requires it)
              if (() {
                final sel = cashinMethods.where((m) => m.id == _selectedPaymentMethod).toList();
                return sel.isNotEmpty && sel.first.supportsCashin;
              }()) ...[
                const Text(
                  'Payment Screenshot (required)',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF111827),
                  ),
                ),
                const SizedBox(height: 6),
                _buildProofUploadWidget(),
                const SizedBox(height: 14),
              ],
            ],

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
      },
    );
  }

  Widget _buildProofUploadWidget() {
    return GestureDetector(
      onTap: _isUploadingProof ? null : _pickPaymentProof,
      child: Container(
        width: double.infinity,
        height: 100,
        decoration: BoxDecoration(
          color: _paymentProofImage != null ? Colors.transparent : const Color(0xFFF9FAFB),
          borderRadius: BorderRadius.circular(9),
          border: Border.all(
            color: _uploadedProofUrl != null
                ? AppColors.primary
                : const Color(0xFFE5E7EB),
            width: 1.5,
          ),
        ),
        child: _isUploadingProof
            ? const Center(child: CircularProgressIndicator())
            : _paymentProofImage != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: FutureBuilder<Uint8List>(
                      future: _paymentProofImage!.readAsBytes(),
                      builder: (ctx, snap) => snap.hasData
                          ? Image.memory(snap.data!, fit: BoxFit.cover)
                          : const Center(child: CircularProgressIndicator()),
                    ),
                  )
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.upload_file_rounded,
                          size: 28, color: AppColors.textSecondary),
                      const SizedBox(height: 6),
                      const Text(
                        'Tap to upload screenshot',
                        style: TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                      ),
                    ],
                  ),
      ),
    );
  }

  Future<void> _pickPaymentProof() async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1280,
        maxHeight: 1280,
        imageQuality: 80,
      );
      if (picked == null || !mounted) return;
      setState(() {
        _paymentProofImage = picked;
        _isUploadingProof = true;
        _uploadedProofUrl = null;
      });
      final filesApi = context.read<FilesApi>();
      final result = await filesApi.uploadProofImage(picked);
      if (mounted) {
        setState(() {
          _uploadedProofUrl = result.fileUrl;
          _isUploadingProof = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isUploadingProof = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload failed: $e')),
        );
      }
    }
  }

  Widget _buildMethodChip(String key, IconData icon, String label) {
    final isSelected = _selectedPaymentMethod == key;
    return GestureDetector(
      onTap: () => setState(() {
        _selectedPaymentMethod = key;
        _paymentRefController.clear();
        _paymentProofImage = null;
        _uploadedProofUrl = null;
      }),
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

  Widget _buildSavedMethodCard(UserPaymentMethod method) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: const Color(0xFFFFF3E0),
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: const Color(0xFFFFB74D)),
          ),
          child: Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: const Color(0xFFFFE0B2),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Icon(
                  method.paymentCode.contains('BANK')
                      ? Icons.account_balance
                      : Icons.phone_android,
                  color: const Color(0xFFE65100),
                  size: 18,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      method.providerName,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF111827),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      method.maskedAccountNumber,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF374151),
                      ),
                    ),
                    if (method.accountName != null && method.accountName!.isNotEmpty)
                      Text(
                        method.accountName!,
                        style: const TextStyle(
                          fontSize: 10,
                          color: Color(0xFF6B7280),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
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
                  pickupType: _pickupType,
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
                  isFree 
                      ? 'Confirm Booking' 
                      : 'Schedule Pickup (Payment Required)',
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
                  isFree 
                      ? 'No payment required' 
                      : '⚠️ Complete payment first, then admin will confirm',
                  style: const TextStyle(
                    fontSize: 10,
                    color: Color(0xFFFF6F00),
                    fontWeight: FontWeight.w600,
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
    required PickupScheduleType pickupType,
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

      // Use the pickupType parameter from user selection instead of widget.arguments

      final paymentRef = _paymentRefController.text.trim();
      final resolvedMode = _resolvePaymentMode(isFree);

      // Validate proof upload when required
      if (!isFree &&
          _selectedPaymentMethod != null &&
          _selectedPaymentMethod != 'CASH' &&
          _paymentProofImage != null &&
          _uploadedProofUrl == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please wait for proof upload to complete')),
          );
        }
        setState(() => _isCreatingJob = false);
        return;
      }

      final job = await jobProvider.createJob(
        scheduledDate: scheduledDate,
        scheduledTime: scheduledTime,
        locationAddress: fullAddress,
        locationLat: locationLat,
        locationLng: locationLng,
        notes: 'Pickup type: ${_getPickupTypeName(pickupType)}',
        paymentMode: isFree ? null : resolvedMode,
        paymentMethod: (isFree || _selectedPaymentMethod == 'CASH') ? null : _selectedPaymentMethod,
        paymentRef: paymentRef.isNotEmpty ? paymentRef : null,
        paymentProofUrl: _uploadedProofUrl,
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