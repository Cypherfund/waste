import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../../providers/auth_provider.dart';
import '../../providers/marketer_provider.dart';

class MarketerProfileScreen extends StatefulWidget {
  const MarketerProfileScreen({super.key});

  @override
  State<MarketerProfileScreen> createState() => _MarketerProfileScreenState();
}

class _MarketerProfileScreenState extends State<MarketerProfileScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MarketerProvider>().loadNotifications();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: Consumer<MarketerProvider>(
        builder: (context, provider, _) {
          final dash = provider.dashboard;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Profile info
              if (dash != null) ...[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        CircleAvatar(
                          radius: 36,
                          backgroundColor: Colors.green.shade100,
                          child: Icon(Icons.person, size: 36, color: Colors.green.shade700),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          dash.profile.referralCode,
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                        ),
                        const SizedBox(height: 4),
                        if (dash.profile.territory != null)
                          Text(dash.profile.territory!, style: const TextStyle(color: Colors.grey)),
                        const SizedBox(height: 8),
                        OutlinedButton.icon(
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: dash.profile.referralCode));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Referral code copied!')),
                            );
                          },
                          icon: const Icon(Icons.copy, size: 16),
                          label: const Text('Copy Referral Code'),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Notifications
              Card(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Notifications', style: Theme.of(context).textTheme.titleSmall),
                          if (provider.unreadCount > 0)
                            TextButton(
                              onPressed: () async {
                                await provider.loadNotifications();
                              },
                              child: Text('${provider.unreadCount} unread'),
                            ),
                        ],
                      ),
                    ),
                    if (provider.notifications.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(16),
                        child: Text('No notifications', style: TextStyle(color: Colors.grey)),
                      )
                    else
                      ...provider.notifications.take(10).map((n) => ListTile(
                        leading: Icon(
                          n.isRead ? Icons.notifications_none : Icons.notifications_active,
                          color: n.isRead ? Colors.grey : Colors.green,
                        ),
                        title: Text(
                          n.title,
                          style: TextStyle(
                            fontWeight: n.isRead ? FontWeight.normal : FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                        subtitle: Text(n.message, style: const TextStyle(fontSize: 12), maxLines: 2, overflow: TextOverflow.ellipsis),
                        dense: true,
                        onTap: () {
                          if (!n.isRead) {
                            provider.markNotificationRead(n.id);
                          }
                        },
                      )),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Logout
              OutlinedButton.icon(
                onPressed: () {
                  context.read<AuthProvider>().logout();
                },
                icon: const Icon(Icons.logout, color: Colors.red),
                label: const Text('Sign Out', style: TextStyle(color: Colors.red)),
                style: OutlinedButton.styleFrom(side: const BorderSide(color: Colors.red)),
              ),
            ],
          );
        },
      ),
    );
  }
}
