import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../models/job.dart';
import '../../providers/jobs_provider.dart';
import '../../widgets/app_card.dart';
import '../../widgets/bottom_cta.dart';

class RateJobScreen extends StatefulWidget {
  const RateJobScreen({super.key});

  @override
  State<RateJobScreen> createState() => _RateJobScreenState();
}

class _RateJobScreenState extends State<RateJobScreen> {
  int _rating = 0;
  final _commentController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (_rating == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select a rating'),
          backgroundColor: AppColors.warning,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final job = ModalRoute.of(context)!.settings.arguments as Job;
    final provider = context.read<JobsProvider>();

    final success = await provider.rateJob(
      job.id,
      value: _rating,
      comment: _commentController.text.trim(),
    );

    setState(() => _isSubmitting = false);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Rating submitted! Thank you.'),
          backgroundColor: AppColors.success,
        ),
      );
      Navigator.pop(context);
    } else if (mounted && provider.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(provider.error!),
          backgroundColor: AppColors.error,
        ),
      );
      provider.clearError();
    }
  }

  @override
  Widget build(BuildContext context) {
    final job = ModalRoute.of(context)!.settings.arguments as Job;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text('Rate Collector', style: AppTypography.heading3),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Job info summary
            AppCard(
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.primarySurface,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.delete_outline, color: AppColors.primary, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          job.locationAddress,
                          style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${job.scheduledDate} • ${job.scheduledTime}',
                          style: AppTypography.caption,
                        ),
                        if (job.collectorName != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            'Collector: ${job.collectorName}',
                            style: AppTypography.caption.copyWith(color: AppColors.primary),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            // Star rating
            Text(
              'How was the service?',
              textAlign: TextAlign.center,
              style: AppTypography.heading3,
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (index) {
                final starValue = index + 1;
                return GestureDetector(
                  onTap: () => setState(() => _rating = starValue),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: AnimatedScale(
                      scale: starValue <= _rating ? 1.15 : 1.0,
                      duration: const Duration(milliseconds: 150),
                      child: Icon(
                        starValue <= _rating ? Icons.star_rounded : Icons.star_outline_rounded,
                        size: 48,
                        color: starValue <= _rating
                            ? AppColors.primary
                            : AppColors.textHint,
                      ),
                    ),
                  ),
                );
              }),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              _ratingLabel,
              textAlign: TextAlign.center,
              style: AppTypography.bodyMedium.copyWith(
                color: _rating > 0 ? AppColors.primary : AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Comment
            AppCard(
              padding: const EdgeInsets.all(4),
              child: TextField(
                controller: _commentController,
                maxLines: 4,
                maxLength: 1000,
                style: AppTypography.body,
                decoration: InputDecoration(
                  labelText: 'Comment (optional)',
                  hintText: 'Tell us about your experience...',
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  contentPadding: const EdgeInsets.all(16),
                  labelStyle: AppTypography.label,
                  hintStyle: AppTypography.body.copyWith(color: AppColors.textHint),
                ),
              ),
            ),
          ],
        ),
      ),
      bottomSheet: BottomCTA(
        label: 'Submit Rating',
        isLoading: _isSubmitting,
        onPressed: _handleSubmit,
        icon: Icons.star_rounded,
      ),
    );
  }

  String get _ratingLabel {
    switch (_rating) {
      case 1:
        return 'Poor';
      case 2:
        return 'Below Average';
      case 3:
        return 'Average';
      case 4:
        return 'Good';
      case 5:
        return 'Excellent';
      default:
        return 'Tap a star to rate';
    }
  }
}
