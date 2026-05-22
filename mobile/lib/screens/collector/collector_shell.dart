import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/collector_jobs_provider.dart';
import '../../providers/collector_earnings_provider.dart';
import '../../services/offline/connectivity_service.dart';
import 'collector_home_tab.dart';
import 'collector_jobs_tab.dart';
import 'collector_earnings_tab.dart';
import 'collector_profile_tab.dart';

class CollectorShell extends StatefulWidget {
  const CollectorShell({super.key});

  @override
  State<CollectorShell> createState() => _CollectorShellState();
}

class _CollectorShellState extends State<CollectorShell> {
  int _currentIndex = 0;
  final _earningsKey = GlobalKey<CollectorEarningsTabState>();
  StreamSubscription<bool>? _connectivitySub;
  bool _wasOffline = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _preloadAll();
      _listenConnectivity();
    });
  }

  void _preloadAll({bool force = false}) {
    final jobs = context.read<CollectorJobsProvider>();
    final earnings = context.read<CollectorEarningsProvider>();
    final connectivity = context.read<ConnectivityService>();

    if (!connectivity.isOnline) return;

    // Load in parallel — skip if fresh unless forced
    if (force || jobs.isStale) {
      jobs.loadJobs(refresh: true);
    }
    if (force || earnings.isStale) {
      earnings.loadQuickSummary();
      earnings.loadWallet();
    }
  }

  void _listenConnectivity() {
    final connectivity = context.read<ConnectivityService>();
    _wasOffline = !connectivity.isOnline;
    _connectivitySub = connectivity.onConnectivityChanged.listen((isOnline) {
      if (isOnline && _wasOffline) {
        debugPrint('[CollectorShell] Back online — refreshing all tab data');
        _preloadAll(force: true);
      }
      _wasOffline = !isOnline;
    });
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: [
          const CollectorHomeTab(),
          const CollectorJobsTab(),
          CollectorEarningsTab(key: _earningsKey),
          const CollectorProfileTab(),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          boxShadow: AppShadows.bottomBar,
        ),
        child: SafeArea(
          top: false,
          child: BottomNavigationBar(
            currentIndex: _currentIndex,
            onTap: (index) {
              if (index == 2) {
                _earningsKey.currentState?.reloadWallet();
              }
              setState(() => _currentIndex = index);
            },
            backgroundColor: Colors.transparent,
            elevation: 0,
            selectedItemColor: AppColors.primary,
            unselectedItemColor: AppColors.textHint,
            type: BottomNavigationBarType.fixed,
            selectedFontSize: 12,
            unselectedFontSize: 12,
            items: const [
              BottomNavigationBarItem(
                icon: Icon(Icons.home_outlined),
                activeIcon: Icon(Icons.home),
                label: 'Home',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.calendar_today_outlined),
                activeIcon: Icon(Icons.calendar_today),
                label: 'Jobs',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.account_balance_wallet_outlined),
                activeIcon: Icon(Icons.account_balance_wallet),
                label: 'Earnings',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.person_outline),
                activeIcon: Icon(Icons.person),
                label: 'Profile',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
