import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/collector_earnings_provider.dart';
import '../../widgets/app_card.dart';
import '../../widgets/loading_button.dart';

class CollectorCashoutScreen extends StatefulWidget {
  const CollectorCashoutScreen({super.key});

  @override
  State<CollectorCashoutScreen> createState() => _CollectorCashoutScreenState();
}

class _CollectorCashoutScreenState extends State<CollectorCashoutScreen> {
  final _amountController = TextEditingController();
  String _selectedMethod = 'Mobile Money';
  bool _isProcessing = false;

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final earnings = context.watch<CollectorEarningsProvider>();
    final available = earnings.quickSummary?.allTime ?? 0;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text('Cashout', style: AppTypography.heading3),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Available Balance
          AppCard(
            color: AppColors.primary,
            shadow: AppShadows.elevated,
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Available Balance',
                  style: AppTypography.caption.copyWith(color: Colors.white70),
                ),
                const SizedBox(height: 4),
                Text(
                  '${available.toStringAsFixed(0)} XAF',
                  style: AppTypography.heading1.copyWith(
                    color: Colors.white,
                    fontSize: 32,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Minimum cashout: 1,000 XAF',
                  style: AppTypography.overline.copyWith(color: Colors.white60),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Enter Amount
          Text(
            'Enter Amount',
            style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _amountController,
            keyboardType: TextInputType.number,
            style: AppTypography.heading2,
            decoration: InputDecoration(
              hintText: '0',
              hintStyle: AppTypography.heading2.copyWith(color: AppColors.textHint),
              suffixText: 'XAF',
              suffixStyle: AppTypography.subtitle.copyWith(color: AppColors.textSecondary),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            ),
          ),
          const SizedBox(height: 24),

          // Payment Method
          Text(
            'Payment Method',
            style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          _buildPaymentMethod(
            'Mobile Money',
            Icons.phone_android,
            'MTN Mobile Money',
          ),
          const SizedBox(height: 8),
          _buildPaymentMethod(
            'Bank Account',
            Icons.account_balance,
            'Bank Transfer',
          ),
          const SizedBox(height: 24),

          // Fee breakdown
          AppCard(
            color: AppColors.inputFill,
            shadow: const [],
            child: Column(
              children: [
                _buildFeeRow('Fee', '0 XAF'),
                const SizedBox(height: 8),
                const Divider(color: AppColors.divider),
                const SizedBox(height: 8),
                _buildFeeRow('You Will Receive', '8,600 XAF', isBold: true),
              ],
            ),
          ),
          const SizedBox(height: 32),

          // Continue button
          LoadingButton(
            label: 'Continue',
            isLoading: _isProcessing,
            onPressed: () => _handleCashout(context),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentMethod(String value, IconData icon, String subtitle) {
    final isSelected = _selectedMethod == value;
    return AppCard(
      onTap: () => setState(() => _selectedMethod = value),
      border: Border.all(
        color: isSelected ? AppColors.primary : AppColors.border,
        width: isSelected ? 1.5 : 1,
      ),
      shadow: const [],
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: isSelected ? AppColors.primarySurface : AppColors.inputFill,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              icon,
              size: 20,
              color: isSelected ? AppColors.primary : AppColors.textSecondary,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value, style: AppTypography.bodyMedium),
                Text(subtitle, style: AppTypography.caption),
              ],
            ),
          ),
          if (isSelected)
            const Icon(Icons.check_circle, color: AppColors.primary, size: 22)
          else
            const Icon(Icons.radio_button_unchecked, color: AppColors.textHint, size: 22),
        ],
      ),
    );
  }

  Widget _buildFeeRow(String label, String value, {bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: AppTypography.body),
        Text(
          value,
          style: isBold
              ? AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w700)
              : AppTypography.bodyMedium,
        ),
      ],
    );
  }

  void _handleCashout(BuildContext context) {
    setState(() => _isProcessing = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (!mounted) return;
      setState(() => _isProcessing = false);
      Navigator.of(this.context).pushReplacementNamed('/collector-cashout-success');
    });
  }
}
