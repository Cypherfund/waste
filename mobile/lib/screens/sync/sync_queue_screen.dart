import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/offline_queue_provider.dart';
import '../../services/offline/offline_queue_service.dart';
import '../../services/offline/sync_service.dart';
import '../../widgets/app_card.dart';

class SyncQueueScreen extends StatefulWidget {
  const SyncQueueScreen({super.key});

  @override
  State<SyncQueueScreen> createState() => _SyncQueueScreenState();
}

class _SyncQueueScreenState extends State<SyncQueueScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<OfflineQueueProvider>().refreshItems();
    });
  }

  @override
  Widget build(BuildContext context) {
    final queue = context.watch<OfflineQueueProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text('Sync Queue', style: AppTypography.heading3),
        actions: [
          if (queue.hasPendingItems && queue.isOnline)
            IconButton(
              icon: const Icon(Icons.sync, color: AppColors.primary),
              onPressed: queue.isSyncing ? null : () => queue.triggerSync(),
              tooltip: 'Sync Now',
            ),
          if (queue.items.any((i) => i.status == QueueStatus.SYNCED))
            IconButton(
              icon: const Icon(Icons.delete_sweep_outlined, color: AppColors.textSecondary),
              onPressed: () => queue.clearSynced(),
              tooltip: 'Clear Synced',
            ),
        ],
      ),
      body: Column(
        children: [
          // Status header card
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
            child: AppCard(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: _statusColor(queue).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(_statusIcon(queue), color: _statusColor(queue), size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _statusText(queue),
                          style: AppTypography.bodyMedium.copyWith(
                            color: _statusColor(queue),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${queue.pendingCount} pending • ${queue.items.where((i) => i.status == QueueStatus.SYNCED).length} synced',
                          style: AppTypography.caption,
                        ),
                      ],
                    ),
                  ),
                  if (queue.syncStatus == SyncStatus.error)
                    TextButton(
                      onPressed: () => queue.retrySync(),
                      child: Text('Retry', style: AppTypography.bodyMedium.copyWith(color: AppColors.primary)),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Queue items
          Expanded(
            child: queue.items.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            color: AppColors.primarySurface,
                            borderRadius: BorderRadius.circular(18),
                          ),
                          child: const Icon(Icons.cloud_done_outlined, size: 36, color: AppColors.primary),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text('Queue is empty', style: AppTypography.subtitle),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          'All actions have been synced',
                          style: AppTypography.caption,
                        ),
                      ],
                    ),
                  )
                : RefreshIndicator(
                    color: AppColors.primary,
                    onRefresh: () => queue.refreshItems(),
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                      itemCount: queue.items.length,
                      itemBuilder: (context, index) {
                        final item = queue.items[index];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _QueueItemCard(item: item),
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Color _statusColor(OfflineQueueProvider queue) {
    if (!queue.isOnline) return AppColors.warning;
    if (queue.isSyncing) return AppColors.info;
    if (queue.syncStatus == SyncStatus.error) return AppColors.error;
    return AppColors.success;
  }

  IconData _statusIcon(OfflineQueueProvider queue) {
    if (!queue.isOnline) return Icons.cloud_off_outlined;
    if (queue.isSyncing) return Icons.sync;
    if (queue.syncStatus == SyncStatus.error) return Icons.sync_problem;
    return Icons.cloud_done_outlined;
  }

  String _statusText(OfflineQueueProvider queue) {
    if (!queue.isOnline) return 'Offline';
    if (queue.isSyncing) return 'Syncing...';
    if (queue.syncStatus == SyncStatus.error) return 'Sync Failed';
    return 'Online';
  }
}

// ─── Queue Item Card ─────────────────────────────────────────────────────────

class _QueueItemCard extends StatelessWidget {
  final QueuedItem item;

  const _QueueItemCard({required this.item});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: _statusColor().withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(_actionIcon(), size: 18, color: _statusColor()),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _actionLabel(),
                  style: AppTypography.bodyMedium,
                ),
                const SizedBox(height: 2),
                if (item.jobId != null)
                  Text(
                    'Job: ${item.jobId!.length > 8 ? '${item.jobId!.substring(0, 8)}...' : item.jobId}',
                    style: AppTypography.overline,
                  ),
                Text(
                  _timeAgo(item.createdAt),
                  style: AppTypography.overline,
                ),
                if (item.errorMessage != null)
                  Text(
                    item.errorMessage!,
                    style: AppTypography.overline.copyWith(color: AppColors.error),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),
          _StatusChip(status: item.status),
        ],
      ),
    );
  }

  String _actionLabel() {
    switch (item.action) {
      case QueueAction.CREATE_JOB:
        return 'Create Job';
      case QueueAction.COMPLETE_JOB:
        return 'Complete Job';
      case QueueAction.RATE_JOB:
        return 'Rate Job';
      case QueueAction.LOCATION_UPDATE:
        return 'Location Update';
    }
  }

  IconData _actionIcon() {
    switch (item.action) {
      case QueueAction.CREATE_JOB:
        return Icons.add_circle_outline;
      case QueueAction.COMPLETE_JOB:
        return Icons.check_circle_outline;
      case QueueAction.RATE_JOB:
        return Icons.star_outline;
      case QueueAction.LOCATION_UPDATE:
        return Icons.location_on_outlined;
    }
  }

  Color _statusColor() {
    switch (item.status) {
      case QueueStatus.PENDING:
        return AppColors.warning;
      case QueueStatus.SYNCING:
        return AppColors.info;
      case QueueStatus.SYNCED:
        return AppColors.success;
      case QueueStatus.FAILED:
        return AppColors.error;
    }
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}

// ─── Status Chip ─────────────────────────────────────────────────────────────

class _StatusChip extends StatelessWidget {
  final QueueStatus status;

  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final color = _color();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: AppRadius.badgeBorder,
      ),
      child: Text(
        status.name,
        style: AppTypography.overline.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Color _color() {
    switch (status) {
      case QueueStatus.PENDING:
        return AppColors.warning;
      case QueueStatus.SYNCING:
        return AppColors.info;
      case QueueStatus.SYNCED:
        return AppColors.success;
      case QueueStatus.FAILED:
        return AppColors.error;
    }
  }
}
