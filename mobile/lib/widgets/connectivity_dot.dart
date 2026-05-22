import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/offline/connectivity_service.dart';

/// A small status dot shown beside a screen title.
/// - Green  → online, data is fresh
/// - Yellow → online but last refresh failed (stale cache shown)
/// - Red    → offline
class ConnectivityDot extends StatelessWidget {
  /// Set to true when the provider's refreshFailed flag is set.
  final bool refreshFailed;

  const ConnectivityDot({super.key, this.refreshFailed = false});

  @override
  Widget build(BuildContext context) {
    final isOnline = context.watch<ConnectivityService>().isOnline;

    final Color color;
    final String tooltip;

    if (!isOnline) {
      color = const Color(0xFFEF4444); // red
      tooltip = 'Offline — showing cached data';
    } else if (refreshFailed) {
      color = const Color(0xFFF59E0B); // amber
      tooltip = 'Couldn\'t refresh — showing cached data';
    } else {
      color = const Color(0xFF22C55E); // green
      tooltip = 'Online';
    }

    return Tooltip(
      message: tooltip,
      child: Container(
        width: 8,
        height: 8,
        margin: const EdgeInsets.only(left: 6, bottom: 1),
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.5),
              blurRadius: 4,
              spreadRadius: 1,
            ),
          ],
        ),
      ),
    );
  }
}
