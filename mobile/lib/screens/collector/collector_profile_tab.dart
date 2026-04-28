import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/app_card.dart';

class CollectorProfileTab extends StatelessWidget {
  const CollectorProfileTab({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          children: [
            // Header
            Text('Profile', style: AppTypography.heading2),
            const SizedBox(height: 20),

            // Profile card
            AppCard(
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 36,
                    backgroundColor: AppColors.primarySurface,
                    child: Text(
                      (user?.name ?? 'C')[0].toUpperCase(),
                      style: AppTypography.heading1.copyWith(
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    user?.name ?? 'Collector',
                    style: AppTypography.heading3,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Collector • Online',
                    style: AppTypography.caption,
                  ),
                  const SizedBox(height: 16),
                  // Stats row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _buildStat('Jobs', '128'),
                      Container(width: 1, height: 30, color: AppColors.divider),
                      _buildStat('Earnings', '24,600 XAF'),
                      Container(width: 1, height: 30, color: AppColors.divider),
                      _buildStat('Rating', '4.8'),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Complete your profile card
            AppCard(
              onTap: () {},
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.primarySurface,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.verified_user_outlined,
                        size: 20, color: AppColors.primary),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Complete your profile',
                          style: AppTypography.bodyMedium,
                        ),
                        Text(
                          'Unlock more features',
                          style: AppTypography.caption,
                        ),
                      ],
                    ),
                  ),
                  // Progress indicator
                  SizedBox(
                    width: 40,
                    height: 40,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        CircularProgressIndicator(
                          value: 0.38,
                          strokeWidth: 3,
                          backgroundColor: AppColors.inputFill,
                          valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                        ),
                        Text(
                          '38%',
                          style: AppTypography.overline.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w700,
                            fontSize: 9,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(Icons.chevron_right, color: AppColors.textHint, size: 20),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Menu items
            _buildMenuItem(
              context,
              icon: Icons.person_outline,
              label: 'My Information',
              onTap: () {},
            ),
            _buildMenuItem(
              context,
              icon: Icons.directions_car_outlined,
              label: 'My Vehicle',
              trailing: '+ Add',
              trailingColor: AppColors.primary,
              onTap: () {},
            ),
            _buildMenuItem(
              context,
              icon: Icons.account_balance_wallet_outlined,
              label: 'Payment Method',
              trailing: '+ Add',
              trailingColor: AppColors.primary,
              onTap: () {},
            ),
            _buildMenuItem(
              context,
              icon: Icons.badge_outlined,
              label: 'ID Verification',
              trailing: '+ Add',
              trailingColor: AppColors.primary,
              onTap: () {},
            ),
            _buildMenuItem(
              context,
              icon: Icons.contact_phone_outlined,
              label: 'Emergency Contact',
              trailing: '+ Add',
              trailingColor: AppColors.primary,
              onTap: () {},
            ),
            _buildMenuItem(
              context,
              icon: Icons.notifications_outlined,
              label: 'Preferences',
              onTap: () {},
            ),

            const SizedBox(height: 12),
            const Divider(color: AppColors.divider),
            const SizedBox(height: 12),

            _buildMenuItem(
              context,
              icon: Icons.bar_chart_outlined,
              label: 'Performance',
              onTap: () {},
            ),
            _buildMenuItem(
              context,
              icon: Icons.help_outline,
              label: 'Help & Support',
              onTap: () {},
            ),
            _buildMenuItem(
              context,
              icon: Icons.settings_outlined,
              label: 'Settings',
              onTap: () {},
            ),

            const SizedBox(height: 20),

            // Logout button
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => auth.logout(),
                icon: const Icon(Icons.logout, size: 18),
                label: const Text('Logout'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.error,
                  side: const BorderSide(color: AppColors.error),
                  minimumSize: const Size(double.infinity, 48),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStat(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 2),
        Text(label, style: AppTypography.caption),
      ],
    );
  }

  Widget _buildMenuItem(
    BuildContext context, {
    required IconData icon,
    required String label,
    String? trailing,
    Color? trailingColor,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 4),
        leading: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: AppColors.inputFill,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 18, color: AppColors.textPrimary),
        ),
        title: Text(label, style: AppTypography.body),
        trailing: trailing != null
            ? Text(
                trailing,
                style: AppTypography.caption.copyWith(
                  color: trailingColor ?? AppColors.textSecondary,
                  fontWeight: FontWeight.w600,
                ),
              )
            : const Icon(Icons.chevron_right, color: AppColors.textHint, size: 20),
      ),
    );
  }
}
