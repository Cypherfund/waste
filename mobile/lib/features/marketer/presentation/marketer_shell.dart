import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/auth_provider.dart';
import '../providers/marketer_provider.dart';
import 'screens/marketer_dashboard_screen.dart';
import 'screens/marketer_leads_screen.dart';
import 'screens/marketer_commissions_screen.dart';
import 'screens/marketer_profile_screen.dart';

class MarketerShell extends StatefulWidget {
  final String? initialTab;

  const MarketerShell({super.key, this.initialTab});

  @override
  State<MarketerShell> createState() => _MarketerShellState();
}

class _MarketerShellState extends State<MarketerShell> {
  int _currentIndex = 0;

  final _pages = const [
    MarketerDashboardScreen(),
    MarketerLeadsScreen(),
    MarketerCommissionsScreen(),
    MarketerProfileScreen(),
  ];

  @override
  void initState() {
    super.initState();
    
    // Set initial tab based on navigation parameter
    if (widget.initialTab == 'earnings') {
      _currentIndex = 2; // Earnings tab index
    } else if (widget.initialTab == 'leads') {
      _currentIndex = 1; // Leads tab index
    }
    
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MarketerProvider>().loadDashboard();
      context.read<MarketerProvider>().refreshUnreadCount();
    });
  }

  @override
  Widget build(BuildContext context) {
    final unread = context.watch<MarketerProvider>().unreadCount;
    final auth = context.watch<AuthProvider>();

    // Navigate to login if user is logged out
    if (auth.status == AuthStatus.unauthenticated) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
        }
      });
    }

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _pages,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          const NavigationDestination(
            icon: Icon(Icons.people_outline),
            selectedIcon: Icon(Icons.people),
            label: 'Leads',
          ),
          const NavigationDestination(
            icon: Icon(Icons.monetization_on_outlined),
            selectedIcon: Icon(Icons.monetization_on),
            label: 'Earnings',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: unread > 0,
              label: Text('$unread'),
              child: const Icon(Icons.person_outline),
            ),
            selectedIcon: const Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
