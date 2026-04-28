import 'package:flutter/material.dart';
import '../config/app_theme.dart';

/// A reusable card component matching the KmerTrash design system.
///
/// Features rounded corners (16px), soft shadow, white background,
/// and consistent padding.
class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;
  final Color? color;
  final Border? border;
  final List<BoxShadow>? shadow;

  const AppCard({
    super.key,
    required this.child,
    this.padding,
    this.onTap,
    this.color,
    this.border,
    this.shadow,
  });

  @override
  Widget build(BuildContext context) {
    final card = Container(
      decoration: BoxDecoration(
        color: color ?? AppColors.surface,
        borderRadius: AppRadius.cardBorder,
        border: border,
        boxShadow: shadow ?? AppShadows.cardSubtle,
      ),
      child: ClipRRect(
        borderRadius: AppRadius.cardBorder,
        child: Padding(
          padding: padding ?? AppSpacing.cardPadding,
          child: child,
        ),
      ),
    );

    if (onTap != null) {
      return GestureDetector(
        onTap: onTap,
        child: card,
      );
    }

    return card;
  }
}

/// A green-themed variant of AppCard used for primary CTA sections
/// (e.g., earnings overview, schedule collection).
class AppCardPrimary extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;

  const AppCardPrimary({
    super.key,
    required this.child,
    this.padding,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      color: AppColors.primary,
      shadow: AppShadows.elevated,
      padding: padding ?? AppSpacing.cardPaddingLarge,
      onTap: onTap,
      child: child,
    );
  }
}
