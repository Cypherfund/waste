import 'package:flutter/material.dart';
import '../../../../config/app_theme.dart';
import '../../../shared/payment_methods_setup_screen.dart';
import '../../providers/payment_flow_provider.dart';
import '../../providers/payment_flow_enums.dart';

/// Reusable payment method card for ChoosePaymentMethodScreen
class PaymentMethodCard extends StatelessWidget {
  final String providerId;
  final String providerName;
  final PaymentProviderMode mode;
  final bool isSelected;
  final VoidCallback onTap;
  final IconData? customIcon;
  final String? imageUrl;

  const PaymentMethodCard({
    super.key,
    required this.providerId,
    required this.providerName,
    required this.mode,
    required this.isSelected,
    required this.onTap,
    this.customIcon,
    this.imageUrl,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected 
              ? const Color(0xFFEAF5EA) 
              : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected 
                ? AppColors.primary 
                : const Color(0xFFE5E7EB),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            // Provider icon or image
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: imageUrl != null ? Colors.white : _getIconBackgroundColor(),
                borderRadius: BorderRadius.circular(10),
              ),
              child: imageUrl != null && imageUrl!.isNotEmpty
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.network(
                        imageUrl!,
                        width: 48,
                        height: 48,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Icon(
                            customIcon ?? _getProviderIcon(),
                            color: _getIconColor(),
                            size: 24,
                          );
                        },
                      ),
                    )
                  : Icon(
                      customIcon ?? _getProviderIcon(),
                      color: _getIconColor(),
                      size: 24,
                    ),
            ),
            const SizedBox(width: 16),
            
            // Provider details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    providerName,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: isSelected 
                          ? AppColors.primary 
                          : const Color(0xFF111827),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _getSubtitle(),
                    style: TextStyle(
                      fontSize: 13,
                      color: isSelected 
                          ? AppColors.primary.withOpacity(0.8)
                          : const Color(0xFF6B7280),
                    ),
                  ),
                ],
              ),
            ),
            
            // Selection indicator
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : Colors.transparent,
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected 
                      ? AppColors.primary 
                      : const Color(0xFFD1D5DB),
                  width: 2,
                ),
              ),
              child: isSelected 
                  ? const Icon(
                      Icons.check,
                      size: 16,
                      color: Colors.white,
                    )
                  : null,
            ),
          ],
        ),
      ),
    );
  }

  IconData _getProviderIcon() {
    if (providerId == 'CASH') {
      return Icons.payments_outlined;
    }
    if (providerName.toLowerCase().contains('mtn')) {
      return Icons.phone_android;
    }
    if (providerName.toLowerCase().contains('orange')) {
      return Icons.phone_iphone;
    }
    if (providerName.toLowerCase().contains('bank')) {
      return Icons.account_balance;
    }
    return Icons.account_balance_wallet_outlined;
  }

  Color _getIconBackgroundColor() {
    if (providerId == 'CASH') {
      return const Color(0xFFE8F5E9);
    }
    if (providerName.toLowerCase().contains('mtn')) {
      return const Color(0xFFFFF8E1); // Yellow-ish for MTN
    }
    if (providerName.toLowerCase().contains('orange')) {
      return const Color(0xFFFFE0B2); // Orange-ish
    }
    return const Color(0xFFE3F2FD);
  }

  Color _getIconColor() {
    if (providerId == 'CASH') {
      return const Color(0xFF2E7D32);
    }
    if (providerName.toLowerCase().contains('mtn')) {
      return const Color(0xFFF57C00);
    }
    if (providerName.toLowerCase().contains('orange')) {
      return const Color(0xFFEF6C00);
    }
    return const Color(0xFF1976D2);
  }

  String _getSubtitle() {
    switch (mode) {
      case PaymentProviderMode.manual:
        return 'Manual verification required';
      case PaymentProviderMode.integrated:
        return 'Instant payment confirmation';
      case PaymentProviderMode.cash:
        return 'Pay when collector arrives';
      case PaymentProviderMode.wallet:
        return 'Instant payment from wallet';
    }
  }
}

/// Cash payment card variant
class CashPaymentCard extends StatelessWidget {
  final bool isSelected;
  final VoidCallback onTap;

  const CashPaymentCard({
    super.key,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return PaymentMethodCard(
      providerId: 'CASH',
      providerName: 'Cash to Collector',
      mode: PaymentProviderMode.cash,
      isSelected: isSelected,
      onTap: onTap,
      customIcon: Icons.payments_outlined,
    );
  }
}
