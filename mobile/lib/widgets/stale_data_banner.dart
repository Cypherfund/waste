import 'package:flutter/material.dart';
import '../config/app_theme.dart';

/// A slim banner shown when a background refresh failed but cached data exists.
/// Disappears automatically when [show] becomes false.
/// The [onRetry] callback fires when the user taps "Retry".
class StaleDataBanner extends StatelessWidget {
  final bool show;
  final VoidCallback onRetry;

  const StaleDataBanner({
    super.key,
    required this.show,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedSize(
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeInOut,
      child: show
          ? Container(
              width: double.infinity,
              margin: const EdgeInsets.fromLTRB(20, 0, 20, 10),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF8E1),
                border: Border.all(color: const Color(0xFFFFE082)),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded,
                      size: 16, color: Color(0xFFF59E0B)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Showing cached data · Couldn\'t refresh',
                      style: AppTypography.caption.copyWith(
                        color: const Color(0xFF92400E),
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: onRetry,
                    child: Text(
                      'Retry',
                      style: AppTypography.caption.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            )
          : const SizedBox.shrink(),
    );
  }
}
