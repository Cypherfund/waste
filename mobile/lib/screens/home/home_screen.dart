import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/jobs_provider.dart';
import '../../widgets/app_card.dart';
import '../../widgets/section_header.dart';
import '../../widgets/job_status_badge.dart';
import '../../widgets/sync_status_banner.dart';
import '../../models/job.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentNavIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<JobsProvider>().loadJobs(refresh: true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final jobsProvider = context.watch<JobsProvider>();
    final activeJobs = jobsProvider.activeJobs;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          const SyncStatusBanner(),
          Expanded(
            child: RefreshIndicator(
              color: AppColors.primary,
              onRefresh: () => jobsProvider.loadJobs(refresh: true),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                children: [
                  // Safe area + greeting
                  SizedBox(height: MediaQuery.of(context).padding.top + 16),
                  _buildGreeting(auth),
                  const SizedBox(height: AppSpacing.lg),

                  // Quick actions
                  _buildQuickActions(context),
                  const SizedBox(height: AppSpacing.lg),

                  // Schedule CTA card
                  _buildScheduleCTA(context),
                  const SizedBox(height: AppSpacing.lg),

                  // Active collections
                  SectionHeader(
                    title: 'Active Collections',
                    actionLabel: 'View All',
                    onAction: () => Navigator.pushNamed(context, '/jobs'),
                  ),
                  const SizedBox(height: AppSpacing.sm),

                  if (jobsProvider.isLoading && activeJobs.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(32),
                      child: Center(
                        child: CircularProgressIndicator(color: AppColors.primary),
                      ),
                    )
                  else if (activeJobs.isEmpty)
                    _buildEmptyState()
                  else
                    ...activeJobs.take(5).map((job) => Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                          child: _ActiveJobTile(job: job),
                        )),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: _buildBottomNav(context),
    );
  }

  Widget _buildGreeting(AuthProvider auth) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Hello, ${auth.user?.name ?? 'User'} 👋',
                style: AppTypography.heading2,
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: AppColors.primaryLight,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Online',
                    style: AppTypography.caption.copyWith(
                      color: AppColors.primaryLight,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        // Notification + Logout
        IconButton(
          onPressed: () => Navigator.pushNamed(context, '/sync-queue'),
          icon: const Icon(Icons.notifications_outlined, color: AppColors.textPrimary),
        ),
        GestureDetector(
          onTap: () => _handleLogout(context),
          child: CircleAvatar(
            radius: 20,
            backgroundColor: AppColors.primarySurface,
            child: Text(
              (auth.user?.name ?? 'U')[0].toUpperCase(),
              style: AppTypography.subtitle.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Row(
      children: [
        _QuickAction(
          icon: Icons.calendar_today_outlined,
          label: 'Schedule\nPickup',
          onTap: () => Navigator.pushNamed(context, '/create-job'),
        ),
        const SizedBox(width: 12),
        _QuickAction(
          icon: Icons.list_alt_outlined,
          label: 'My\nBookings',
          onTap: () => Navigator.pushNamed(context, '/jobs'),
        ),
        const SizedBox(width: 12),
        _QuickAction(
          icon: Icons.account_balance_wallet_outlined,
          label: 'Wallet',
          onTap: () {},
        ),
        const SizedBox(width: 12),
        _QuickAction(
          icon: Icons.sync_outlined,
          label: 'Sync\nQueue',
          onTap: () => Navigator.pushNamed(context, '/sync-queue'),
        ),
      ],
    );
  }

  Widget _buildScheduleCTA(BuildContext context) {
    return AppCardPrimary(
      onTap: () => Navigator.pushNamed(context, '/create-job'),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.add, color: Colors.white, size: 28),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Schedule Collection',
                  style: AppTypography.subtitle.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Request a new waste pickup',
                  style: AppTypography.caption.copyWith(
                    color: Colors.white70,
                  ),
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, color: Colors.white70, size: 24),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return AppCard(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: AppColors.primarySurface,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.check_circle_outline,
              size: 32,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'No active collections',
            style: AppTypography.subtitle.copyWith(
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'Schedule a pickup to get started',
            style: AppTypography.caption,
          ),
        ],
      ),
    );
  }

  Widget _buildBottomNav(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        boxShadow: AppShadows.bottomBar,
      ),
      child: SafeArea(
        top: false,
        child: BottomNavigationBar(
          currentIndex: _currentNavIndex,
          onTap: (index) {
            setState(() => _currentNavIndex = index);
            switch (index) {
              case 0:
                break;
              case 1:
                Navigator.pushNamed(context, '/jobs');
                break;
              case 2:
                Navigator.pushNamed(context, '/sync-queue');
                break;
            }
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
              label: 'Bookings',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.sync_outlined),
              activeIcon: Icon(Icons.sync),
              label: 'Sync',
            ),
          ],
        ),
      ),
    );
  }

  void _handleLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: AppRadius.cardBorder),
        title: Text('Sign Out', style: AppTypography.heading3),
        content: Text(
          'Are you sure you want to sign out?',
          style: AppTypography.body.copyWith(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: AppTypography.bodyMedium.copyWith(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<AuthProvider>().logout();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: AppRadius.buttonBorder),
            ),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }
}

// ─── Quick Action Grid Item ──────────────────────────────────────────────────

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _QuickAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: AppRadius.cardBorder,
            boxShadow: AppShadows.cardSubtle,
          ),
          child: Column(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primarySurface,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: AppColors.primary, size: 22),
              ),
              const SizedBox(height: 8),
              Text(
                label,
                textAlign: TextAlign.center,
                style: AppTypography.overline.copyWith(
                  color: AppColors.textPrimary,
                  fontSize: 11,
                ),
                maxLines: 2,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Active Job Tile ─────────────────────────────────────────────────────────

class _ActiveJobTile extends StatelessWidget {
  final Job job;

  const _ActiveJobTile({required this.job});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: () => Navigator.pushNamed(context, '/job-detail', arguments: job),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.primarySurface,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.delete_outline, color: AppColors.primary, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  job.locationAddress,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.bodyMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  '${job.scheduledDate} • ${job.scheduledTime}',
                  style: AppTypography.caption,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          JobStatusBadge(status: job.status),
        ],
      ),
    );
  }
}
