import 'package:flutter/material.dart';
import '../../../../config/app_theme.dart';

class Notification {
  final String id;
  final String title;
  final String message;
  final DateTime time;
  final bool isRead;
  final String? type; // 'booking', 'payment', 'system', 'promo'

  const Notification({
    required this.id,
    required this.title,
    required this.message,
    required this.time,
    this.isRead = false,
    this.type,
  });
}

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final List<Notification> _notifications = [
    const Notification(
      id: '1',
      title: 'Collector assigned',
      message: 'John Doe has been assigned to your pickup scheduled for today at 2:00 PM',
      time: DateTime.now().subtract(Duration(minutes: 30)),
      isRead: false,
      type: 'booking',
    ),
    const Notification(
      id: '2',
      title: 'Pickup completed',
      message: 'Your pickup has been completed successfully. Please rate your experience.',
      time: DateTime.now().subtract(Duration(hours: 5)),
      isRead: false,
      type: 'booking',
    ),
    const Notification(
      id: '3',
      title: 'Payment received',
      message: '10,000 XAF has been added to your wallet via Mobile Money',
      time: DateTime.now().subtract(Duration(days: 1)),
      isRead: true,
      type: 'payment',
    ),
    const Notification(
      id: '4',
      title: 'Welcome to Hysacam!',
      message: 'Thank you for joining us. Schedule your first pickup and get 10% off!',
      time: DateTime.now().subtract(Duration(days: 3)),
      isRead: true,
      type: 'promo',
    ),
    const Notification(
      id: '5',
      title: 'Scheduled pickup reminder',
      message: 'Your pickup is scheduled for tomorrow at 10:00 AM. Please have your waste ready.',
      time: DateTime.now().subtract(Duration(days: 5)),
      isRead: true,
      type: 'booking',
    ),
  ];

  @override
  Widget build(BuildContext context) {
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
          TextButton(
            onPressed: _markAllAsRead,
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
      body: _notifications.isEmpty
          ? _buildEmptyState()
          : ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: _notifications.length,
              itemBuilder: (context, index) {
                final notification = _notifications[index];
                return _buildNotificationCard(notification, index);
              },
            ),
    );
  }
  
  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.notifications_none,
              size: 100,
              color: Colors.grey.shade300,
            ),
            const SizedBox(height: 24),
            const Text(
              'No notifications',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'You\'re all caught up!',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildNotificationCard(Notification notification, int index) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: notification.isRead ? Colors.white : Colors.blue.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: notification.isRead ? Colors.grey.shade200 : AppColors.primary,
          width: notification.isRead ? 1 : 2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: _getNotificationColor(notification.type).withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              _getNotificationIcon(notification.type),
              color: _getNotificationColor(notification.type),
              size: 20,
            ),
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
                        notification.title,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: notification.isRead
                              ? FontWeight.normal
                              : FontWeight.w600,
                          color: Colors.black87,
                        ),
                      ),
                    ),
                    if (!notification.isRead)
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  notification.message,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey.shade700,
                    height: 1.4,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                Text(
                  _getTimeAgo(notification.time),
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
  
  Color _getNotificationColor(String? type) {
    switch (type) {
      case 'booking':
        return AppColors.primary;
      case 'payment':
        return Colors.green;
      case 'system':
        return Colors.blue;
      case 'promo':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }
  
  IconData _getNotificationIcon(String? type) {
    switch (type) {
      case 'booking':
        return Icons.event_note;
      case 'payment':
        return Icons.payment;
      case 'system':
        return Icons.info;
      case 'promo':
        return Icons.local_offer;
      default:
        return Icons.notifications;
    }
  }
  
  String _getTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);
    
    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes} min ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours} hour${difference.inHours == 1 ? '' : 's'} ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} day${difference.inDays == 1 ? '' : 's'} ago';
    } else {
      return '${dateTime.day} ${_getMonthName(dateTime.month)}';
    }
  }
  
  String _getMonthName(int month) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[month - 1];
  }
  
  void _markAllAsRead() {
    setState(() {
      for (int i = 0; i < _notifications.length; i++) {
        _notifications[i] = Notification(
          id: _notifications[i].id,
          title: _notifications[i].title,
          message: _notifications[i].message,
          time: _notifications[i].time,
          isRead: true,
          type: _notifications[i].type,
        );
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('All notifications marked as read')),
    );
  }
}
