import 'package:flutter/material.dart';
import '../../../../config/app_theme.dart';

/// Reusable page scaffold used by all onboarding screens.
///
/// Provides:
/// - White/background colour
/// - Optional back button
/// - Step indicator dots
/// - Consistent padding
class OnboardingPageWrapper extends StatelessWidget {
  final Widget child;
  final VoidCallback? onBack;
  final int currentStep;
  final int totalSteps;
  final bool showStepIndicator;

  const OnboardingPageWrapper({
    super.key,
    required this.child,
    this.onBack,
    this.currentStep = 0,
    this.totalSteps = 4,
    this.showStepIndicator = true,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Top bar: back + step dots
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              child: Row(
                children: [
                  if (onBack != null)
                    IconButton(
                      onPressed: onBack,
                      icon: const Icon(
                        Icons.arrow_back_ios_new,
                        size: 20,
                        color: AppColors.textPrimary,
                      ),
                    )
                  else
                    const SizedBox(width: 48), // placeholder for alignment

                  if (showStepIndicator) ...[
                    const Spacer(),
                    _StepIndicator(
                      current: currentStep,
                      total: totalSteps,
                    ),
                    const Spacer(),
                    const SizedBox(width: 48), // balance the back button
                  ] else
                    const Spacer(),
                ],
              ),
            ),

            // Content
            Expanded(child: child),
          ],
        ),
      ),
    );
  }
}

/// Horizontal dots showing the current onboarding step.
class _StepIndicator extends StatelessWidget {
  final int current;
  final int total;

  const _StepIndicator({required this.current, required this.total});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(total, (i) {
        final isActive = i == current;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeInOut,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          width: isActive ? 24 : 8,
          height: 8,
          decoration: BoxDecoration(
            color: isActive ? AppColors.primary : AppColors.primary.withOpacity(0.2),
            borderRadius: BorderRadius.circular(4),
          ),
        );
      }),
    );
  }
}
