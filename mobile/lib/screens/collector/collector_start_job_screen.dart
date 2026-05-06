import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../models/job.dart';
import '../../providers/collector_jobs_provider.dart';
import '../../widgets/app_card.dart';
import '../../widgets/loading_button.dart';

class CollectorStartJobScreen extends StatelessWidget {
  final Job job;

  const CollectorStartJobScreen({super.key, required this.job});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CollectorJobsProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text('Start Job', style: AppTypography.heading3),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Pickup Details header
          Text('Pickup Details', style: AppTypography.heading3),
          const SizedBox(height: 16),

          // Customer info
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildDetailRow('Customer', job.householdName ?? 'Customer'),
                const Divider(height: 20, color: AppColors.divider),
                _buildDetailRow('Waste Type', 'Household Waste', icon: Icons.delete_outline),
                const Divider(height: 20, color: AppColors.divider),
                _buildDetailRow('Instructions',
                    job.notes ?? 'Please collect the bag placed by the gate.',
                    icon: Icons.info_outline),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Location card
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: AppColors.primarySurface,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.location_on,
                          size: 18, color: AppColors.primary),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(job.locationAddress, style: AppTypography.bodyMedium),
                          Text('2.4 km • 8 min ETA', style: AppTypography.caption),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Payment info
          AppCard(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Payment', style: AppTypography.caption),
                    const SizedBox(height: 4),
                    Text(
                      '1,400 XAF',
                      style: AppTypography.heading3.copyWith(
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.primarySurface,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'Cash',
                    style: AppTypography.caption.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Contact buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.phone, size: 18),
                  label: const Text('Call Customer'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary),
                    minimumSize: const Size(0, 44),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),

          // Start Pickup button
          LoadingButton(
            label: 'Start Pickup',
            icon: Icons.play_arrow,
            isLoading: provider.isActioning,
            onPressed: () => _handleStartPickup(context, provider),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, {IconData? icon}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (icon != null) ...[
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: AppColors.primarySurface,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 16, color: AppColors.primary),
          ),
          const SizedBox(width: 10),
        ],
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: AppTypography.caption),
              const SizedBox(height: 2),
              Text(value, style: AppTypography.bodyMedium),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _handleStartPickup(
      BuildContext context, CollectorJobsProvider provider) async {
    Navigator.pushReplacementNamed(
      context,
      '/collector-complete-job',
      arguments: job,
    );
  }
}
