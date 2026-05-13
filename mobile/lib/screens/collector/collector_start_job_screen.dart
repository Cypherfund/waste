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

  String _formatScheduledDate(String date, String time) {
    final parsedDate = DateTime.tryParse(date);
    if (parsedDate == null) return '$date at $time';
    
    final day = parsedDate.day.toString().padLeft(2, '0');
    final month = parsedDate.month.toString().padLeft(2, '0');
    final year = parsedDate.year;
    return '$day/$month/$year at $time';
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CollectorJobsProvider>();
    final bool canStart = _canStartJob();

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
                _buildDetailRow(
                  'Scheduled Date',
                  _formatScheduledDate(job.scheduledDate, job.scheduledTime),
                  icon: Icons.calendar_today_outlined,
                ),
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
                      job.quotedPrice != null 
                          ? '${job.quotedPrice!.toInt()} XAF'
                          : '0 XAF',
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

          // Start Pickup button - disabled if too early
          LoadingButton(
            label: canStart ? 'Start Pickup' : 'Too Early - Check Date',
            icon: Icons.play_arrow,
            isLoading: provider.isActioning,
            onPressed: canStart ? () => _handleStartPickup(context, provider) : null,
          ),
          if (!canStart) ...[
            const SizedBox(height: 12),
            Center(
              child: Text(
                'You can start this job on or after ${_formatScheduledDate(job.scheduledDate, job.scheduledTime).split(' at ').first}',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFFF97316),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
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

  bool _canStartJob() {
    final scheduledDate = DateTime.tryParse(job.scheduledDate);
    if (scheduledDate == null) return true; // Allow if can't parse
    
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final jobDate = DateTime(scheduledDate.year, scheduledDate.month, scheduledDate.day);
    
    // Can only start on or after the scheduled date
    return !jobDate.isAfter(today);
  }

  void _showTooEarlyDialog(BuildContext context) {
    final scheduledDate = DateTime.tryParse(job.scheduledDate);
    final formattedDate = scheduledDate != null
        ? '${scheduledDate.day}/${scheduledDate.month}/${scheduledDate.year}'
        : job.scheduledDate;
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Too Early'),
        content: Text(
          'This job is scheduled for $formattedDate. You can only start it on or after the scheduled date.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  Future<void> _handleStartPickup(
      BuildContext context, CollectorJobsProvider provider) async {
    if (!_canStartJob()) {
      _showTooEarlyDialog(context);
      return;
    }
    
    Navigator.pushReplacementNamed(
      context,
      '/collector-complete-job',
      arguments: job,
    );
  }
}
