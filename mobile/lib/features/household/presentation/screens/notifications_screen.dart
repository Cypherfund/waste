import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/app_theme.dart';
import '../../../../providers/notifications_provider.dart';
import '../../../../services/api/notifications_api.dart';
import '../../../../widgets/skeleton_loader.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationsProvider>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NotificationsProvider>();

    return Scaffold(
      backgroundColor: const Color(0xFFF4F7F4),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Notifications',
          style: TextStyle(
            color: Colors.black,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
        actions: [
          if (provider.notifications.any((n) => !n.isRead))
            TextButton(
              onPressed: () => provider.markAllAsRead(),
              child: Text(
                'Mark all read',
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
        ],
      ),
      body: provider.isLoading
          ? _buildSkeletonLoader()
          : provider.error != null && provider.notifications.isEmpty
              ? _buildErrorState(provider)
              : provider.notifications.isEmpty
                  ? _buildEmptyState()
                  : RefreshIndicator(
                      color: AppColors.primary,
                      onRefresh: () => provider.load(),
                      child: ListView.builder(
                        padding: const EdgeInsets.all(20),
                        itemCount: provider.notifications.length,
                        itemBuilder: (context, index) {
                          final n = provider.notifications[index];
                          return _buildNotificationCard(n, provider);
                        },
                      ),
                    ),
    );
  }

  Widget _buildSkeletonLoader() {
    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: 5,
      itemBuilder: (context, index) {
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SkeletonLoader(
                width: 40,
                height: 40,
                borderRadius: BorderRadius.circular(10),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SkeletonLoader(
                      width: double.infinity,
                      height: 16,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    const SizedBox(height: 8),
                    SkeletonLoader(
                      width: double.infinity,
                      height: 14,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    const SizedBox(height: 6),
                    SkeletonLoader(
                      width: 80,
                      height: 12,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.notifications_none, size: 80, color: Colors.grey.shade300),
            const SizedBox(height: 20),
            const Text(
              'No notifications',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87),
            ),
            const SizedBox(height: 8),
            Text("You're all caught up!",
                style: TextStyle(fontSize: 14, color: Colors.grey.shade600)),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(NotificationsProvider provider) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.wifi_off_rounded, size: 60, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text(provider.error ?? 'Failed to load notifications',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14, color: Colors.black54)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => provider.load(),
              style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary, foregroundColor: Colors.white),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationCard(AppNotification n, NotificationsProvider provider) {
    final color = _typeColor(n.type);
    return GestureDetector(
      onTap: () {
        if (!n.isRead) provider.markAsRead(n.id);
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: n.isRead ? Colors.white : Colors.blue.shade50,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: n.isRead ? Colors.grey.shade200 : AppColors.primary,
            width: n.isRead ? 1 : 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(_typeIcon(n.type), color: color, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          n.title,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: n.isRead ? FontWeight.w500 : FontWeight.w700,
                            color: Colors.black87,
                          ),
                        ),
                      ),
                      if (!n.isRead)
                        Container(
                          width: 8, height: 8,
                          decoration: BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    n.body,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 13, color: Colors.grey.shade700, height: 1.4),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _timeAgo(n.createdAt),
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _typeColor(String type) {
    switch (type.toUpperCase()) {
      case 'JOB_ASSIGNED':
      case 'JOB_STARTED':
      case 'JOB_COMPLETED':
        return AppColors.primary;
      case 'PAYMENT':
      case 'WALLET':
        return Colors.green;
      case 'PROMO':
        return Colors.orange;
      default:
        return Colors.blueGrey;
    }
  }

  IconData _typeIcon(String type) {
    switch (type.toUpperCase()) {
      case 'JOB_ASSIGNED':
      case 'JOB_STARTED':
      case 'JOB_COMPLETED':
        return Icons.recycling_rounded;
      case 'PAYMENT':
      case 'WALLET':
        return Icons.account_balance_wallet_outlined;
      case 'PROMO':
        return Icons.local_offer_outlined;
      default:
        return Icons.notifications_outlined;
    }
  }

  String _timeAgo(DateTime dateTime) {
    final diff = DateTime.now().difference(dateTime);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return '${dateTime.day} ${m[dateTime.month - 1]}';
  }
}
