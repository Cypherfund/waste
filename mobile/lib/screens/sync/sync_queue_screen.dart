import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/offline_queue_provider.dart';
import '../../services/offline/offline_queue_service.dart';
import '../../services/offline/sync_service.dart';

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
      appBar: AppBar(
        title: const Text('Sync Queue'),
        actions: [
          if (queue.hasPendingItems && queue.isOnline)
            IconButton(
              icon: const Icon(Icons.sync),
              onPressed: queue.isSyncing ? null : () => queue.triggerSync(),
              tooltip: 'Sync Now',
            ),
          if (queue.items.any((i) => i.status == QueueStatus.SYNCED))
            IconButton(
              icon: const Icon(Icons.delete_sweep),
              onPressed: () => queue.clearSynced(),
              tooltip: 'Clear Synced',
            ),
        ],
      ),
      body: Column(
        children: [
          // Status header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            color: _statusColor(queue).withOpacity(0.1),
            child: Row(
              children: [
                Icon(_statusIcon(queue), color: _statusColor(queue)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _statusText(queue),
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: _statusColor(queue),
                        ),
                      ),
                      Text(
                        '${queue.pendingCount} pending • ${queue.items.where((i) => i.status == QueueStatus.SYNCED).length} synced',
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                if (queue.syncStatus == SyncStatus.error)
                  TextButton(
                    onPressed: () => queue.retrySync(),
                    child: const Text('Retry'),
                  ),
              ],
            ),
          ),

          // Queue items
          Expanded(
            child: queue.items.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.cloud_done,
                            size: 64, color: Colors.grey[300]),
                        const SizedBox(height: 12),
                        Text(
                          'Queue is empty',
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'All actions have been synced',
                          style: TextStyle(
                              color: Colors.grey[500], fontSize: 12),
                        ),
                      ],
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: () => queue.refreshItems(),
                    child: ListView.builder(
                      padding: const EdgeInsets.all(8),
                      itemCount: queue.items.length,
                      itemBuilder: (context, index) {
                        final item = queue.items[index];
                        return _QueueItemCard(item: item);
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Color _statusColor(OfflineQueueProvider queue) {
    if (!queue.isOnline) return Colors.orange;
    if (queue.isSyncing) return Colors.blue;
    if (queue.syncStatus == SyncStatus.error) return Colors.red;
    return Colors.green;
  }

  IconData _statusIcon(OfflineQueueProvider queue) {
    if (!queue.isOnline) return Icons.cloud_off;
    if (queue.isSyncing) return Icons.sync;
    if (queue.syncStatus == SyncStatus.error) return Icons.sync_problem;
    return Icons.cloud_done;
  }

  String _statusText(OfflineQueueProvider queue) {
    if (!queue.isOnline) return 'Offline';
    if (queue.isSyncing) return 'Syncing...';
    if (queue.syncStatus == SyncStatus.error) return 'Sync Failed';
    return 'Online';
  }
}

class _QueueItemCard extends StatelessWidget {
  final QueuedItem item;

  const _QueueItemCard({required this.item});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 6),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _statusColor().withOpacity(0.15),
          radius: 18,
          child: Icon(_actionIcon(), size: 18, color: _statusColor()),
        ),
        title: Text(
          _actionLabel(),
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (item.jobId != null)
              Text(
                'Job: ${item.jobId!.length > 8 ? '${item.jobId!.substring(0, 8)}...' : item.jobId}',
                style: TextStyle(color: Colors.grey[500], fontSize: 11),
              ),
            Text(
              _timeAgo(item.createdAt),
              style: TextStyle(color: Colors.grey[500], fontSize: 11),
            ),
            if (item.errorMessage != null)
              Text(
                item.errorMessage!,
                style: const TextStyle(color: Colors.red, fontSize: 11),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
          ],
        ),
        trailing: _StatusChip(status: item.status),
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
        return Colors.orange;
      case QueueStatus.SYNCING:
        return Colors.blue;
      case QueueStatus.SYNCED:
        return Colors.green;
      case QueueStatus.FAILED:
        return Colors.red;
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

class _StatusChip extends StatelessWidget {
  final QueueStatus status;

  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final color = _color();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        status.name,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Color _color() {
    switch (status) {
      case QueueStatus.PENDING:
        return Colors.orange;
      case QueueStatus.SYNCING:
        return Colors.blue;
      case QueueStatus.SYNCED:
        return Colors.green;
      case QueueStatus.FAILED:
        return Colors.red;
    }
  }
}
