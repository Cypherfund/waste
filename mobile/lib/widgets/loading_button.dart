import 'package:flutter/material.dart';
import '../config/app_theme.dart';

/// Button variant types for the PrimaryButton/LoadingButton.
enum ButtonVariant { primary, secondary, danger }

/// A full-width action button with loading state support.
///
/// Supports three variants:
/// - `primary`: Filled green button (default)
/// - `secondary`: Outlined green button
/// - `danger`: Filled red button
class LoadingButton extends StatelessWidget {
  final String label;
  final bool isLoading;
  final VoidCallback? onPressed;
  final Color? color;
  final IconData? icon;
  final ButtonVariant variant;

  const LoadingButton({
    super.key,
    required this.label,
    this.isLoading = false,
    this.onPressed,
    this.color,
    this.icon,
    this.variant = ButtonVariant.primary,
  });

  @override
  Widget build(BuildContext context) {
    switch (variant) {
      case ButtonVariant.secondary:
        return _buildOutlined(context);
      case ButtonVariant.danger:
        return _buildFilled(context, AppColors.error);
      case ButtonVariant.primary:
        return _buildFilled(context, color ?? AppColors.primary);
    }
  }

  Widget _buildFilled(BuildContext context, Color bg) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: bg,
          foregroundColor: Colors.white,
          disabledBackgroundColor: bg.withValues(alpha: 0.5),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: AppRadius.buttonBorder,
          ),
        ),
        child: _buildChild(Colors.white),
      ),
    );
  }

  Widget _buildOutlined(BuildContext context) {
    final borderColor = color ?? AppColors.primary;
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: OutlinedButton(
        onPressed: isLoading ? null : onPressed,
        style: OutlinedButton.styleFrom(
          foregroundColor: borderColor,
          side: BorderSide(color: borderColor, width: 1.5),
          shape: RoundedRectangleBorder(
            borderRadius: AppRadius.buttonBorder,
          ),
        ),
        child: _buildChild(borderColor),
      ),
    );
  }

  Widget _buildChild(Color textColor) {
    if (isLoading) {
      return SizedBox(
        width: 24,
        height: 24,
        child: CircularProgressIndicator(
          strokeWidth: 2.5,
          color: textColor,
        ),
      );
    }

    if (icon != null) {
      return Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 20),
          const SizedBox(width: AppSpacing.sm),
          Text(
            label,
            style: AppTypography.button.copyWith(color: textColor),
          ),
        ],
      );
    }

    return Text(
      label,
      style: AppTypography.button.copyWith(color: textColor),
    );
  }
}
