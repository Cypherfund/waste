import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/offline_queue_provider.dart';
import '../services/offline/sync_service.dart';

class SyncStatusBanner extends StatelessWidget {
  const SyncStatusBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final queue = context.watch<OfflineQueueProvider>();

    if (!queue.isOnline) {
      return _Banner(
        icon: Icons.cloud_off,
        message: 'You are offline',
        subtitle: queue.pendingCount > 0
            ? '${queue.pendingCount} action(s) queued'
            : null,
        color: Colors.orange,
      );
    }

    if (queue.isSyncing) {
      return _Banner(
        icon: Icons.sync,
        message: 'Syncing...',
        subtitle: '${queue.pendingCount} action(s) remaining',
        color: Colors.blue,
        showProgress: true,
      );
    }

    if (queue.syncStatus == SyncStatus.error && queue.pendingCount > 0) {
      return _Banner(
        icon: Icons.sync_problem,
        message: 'Sync failed',
        subtitle: '${queue.pendingCount} action(s) pending',
        color: Colors.red,
        action: TextButton(
          onPressed: () => queue.retrySync(),
          child: const Text('Retry', style: TextStyle(color: Colors.white)),
        ),
      );
    }

    if (queue.syncStatus == SyncStatus.completed &&
        queue.lastResult != null &&
        queue.lastResult!.synced > 0) {
      return _Banner(
        icon: Icons.cloud_done,
        message: 'Sync complete',
        subtitle: '${queue.lastResult!.synced} action(s) synced',
        color: Colors.green,
      );
    }

    return const SizedBox.shrink();
  }
}

class _Banner extends StatelessWidget {
  final IconData icon;
  final String message;
  final String? subtitle;
  final Color color;
  final bool showProgress;
  final Widget? action;

  const _Banner({
    required this.icon,
    required this.message,
    this.subtitle,
    required this.color,
    this.showProgress = false,
    this.action,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      color: color.withOpacity(0.9),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            if (showProgress)
              const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              )
            else
              Icon(icon, color: Colors.white, size: 18),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    message,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                  if (subtitle != null)
                    Text(
                      subtitle!,
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 11,
                      ),
                    ),
                ],
              ),
            ),
            if (action != null) action!,
          ],
        ),
      ),
    );
  }
}

class OfflineBadge extends StatelessWidget {
  const OfflineBadge({super.key});

  @override
  Widget build(BuildContext context) {
    final queue = context.watch<OfflineQueueProvider>();

    if (queue.pendingCount == 0) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: queue.isOnline ? Colors.blue : Colors.orange,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        '${queue.pendingCount}',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
