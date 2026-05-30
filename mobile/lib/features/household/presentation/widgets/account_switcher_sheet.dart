import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/app_theme.dart';
import '../../../../main.dart' show appNavigatorKey;
import '../../../../models/saved_account.dart';
import '../../../../providers/auth_provider.dart';

class AccountSwitcherSheet extends StatefulWidget {
  const AccountSwitcherSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const AccountSwitcherSheet(),
    );
  }

  @override
  State<AccountSwitcherSheet> createState() => _AccountSwitcherSheetState();
}

class _AccountSwitcherSheetState extends State<AccountSwitcherSheet> {
  String? _removingId;
  String? _switchingId;

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        final accounts = auth.savedAccounts;
        final activeId = auth.user?.id;

        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom +
                MediaQuery.of(context).padding.bottom +
                16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Handle bar
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFE5E7EB),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              // Title
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                child: Row(
                  children: [
                    const Text(
                      'Switch Account',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF111827),
                      ),
                    ),
                    const Spacer(),
                    if (auth.isSwitching)
                      const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                  ],
                ),
              ),

              const Divider(height: 1),

              // Account list
              if (accounts.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 32),
                  child: Text(
                    'No saved accounts',
                    style: TextStyle(
                      fontSize: 14,
                      color: Color(0xFF9CA3AF),
                    ),
                  ),
                )
              else
                ConstrainedBox(
                  constraints: BoxConstraints(
                    maxHeight: MediaQuery.of(context).size.height * 0.45,
                  ),
                  child: ListView.separated(
                    shrinkWrap: true,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    itemCount: accounts.length,
                    separatorBuilder: (_, __) =>
                        const Divider(height: 1, indent: 68),
                    itemBuilder: (context, index) {
                      final account = accounts[index];
                      final isActive = account.id == activeId;
                      final isRemoving = _removingId == account.id;

                      return Dismissible(
                        key: Key(account.id),
                        direction: isActive
                            ? DismissDirection.none
                            : DismissDirection.endToStart,
                        background: Container(
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 20),
                          color: Colors.red.shade50,
                          child: Icon(Icons.delete_outline,
                              color: Colors.red.shade600),
                        ),
                        confirmDismiss: (_) async {
                          return await _confirmRemove(context, account);
                        },
                        onDismissed: (_) async {
                          setState(() => _removingId = account.id);
                          await auth.removeAccount(account.id);
                          setState(() => _removingId = null);
                        },
                        child: _AccountTile(
                          account: account,
                          isActive: isActive,
                          isLoading: _switchingId == account.id || isRemoving,
                          onTap: isActive || auth.isSwitching
                              ? null
                              : () async {
                                  setState(() => _switchingId = account.id);
                                  await auth.switchAccount(account);
                                  if (context.mounted) {
                                    setState(() => _switchingId = null);
                                    
                                    // Show error if switch failed
                                    if (auth.error != null) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text(auth.error!),
                                          backgroundColor: Colors.red.shade600,
                                          behavior: SnackBarBehavior.floating,
                                        ),
                                      );
                                      return;
                                    }
                                    
                                    // Only navigate if switch was successful
                                    if (auth.status == AuthStatus.authenticated) {
                                      Navigator.pop(context);
                                      final isCollector = auth.user?.isCollector == true;
                                      final isMarketer = auth.user?.isMarketer == true;
                                      final route = isCollector
                                          ? '/collector-home'
                                          : isMarketer
                                              ? '/marketer-home'
                                              : '/home';
                                      appNavigatorKey.currentState
                                          ?.pushNamedAndRemoveUntil(route, (r) => false);
                                    }
                                  }
                                },
                        ),
                      );
                    },
                  ),
                ),

              const Divider(height: 1),

              // Add account button
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                child: SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: OutlinedButton.icon(
                    onPressed: auth.isSwitching
                        ? null
                        : () {
                            Navigator.pop(context);
                            Navigator.pushNamed(context, '/add-account');
                          },
                    icon: const Icon(Icons.add_rounded, size: 20),
                    label: const Text(
                      'Add Account',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: BorderSide(color: AppColors.primary),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<bool> _confirmRemove(
      BuildContext context, SavedAccount account) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Remove account?',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
        ),
        content: Text(
          'Remove ${account.name} (${account.isHousehold ? 'Household' : 'Collector'}) from this device?',
          style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Remove',
                style: TextStyle(color: Colors.red.shade600)),
          ),
        ],
      ),
    );
    return result ?? false;
  }
}

class _AccountTile extends StatelessWidget {
  final SavedAccount account;
  final bool isActive;
  final bool isLoading;
  final VoidCallback? onTap;

  const _AccountTile({
    required this.account,
    required this.isActive,
    required this.isLoading,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
      leading: Stack(
        children: [
          CircleAvatar(
            radius: 24,
            backgroundColor: account.isHousehold
                ? AppColors.primary.withValues(alpha: 0.12)
                : account.isMarketer
                    ? const Color(0xFF8B5CF6).withValues(alpha: 0.15)
                    : const Color(0xFFF59E0B).withValues(alpha: 0.15),
            child: Text(
              account.initials,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: account.isHousehold
                    ? AppColors.primary
                    : account.isMarketer
                        ? const Color(0xFF7C3AED)
                        : const Color(0xFFF59E0B),
              ),
            ),
          ),
          if (isActive)
            Positioned(
              bottom: 0,
              right: 0,
              child: Container(
                width: 14,
                height: 14,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
                child: const Icon(Icons.check,
                    size: 8, color: Colors.white),
              ),
            ),
        ],
      ),
      title: Text(
        account.name,
        style: TextStyle(
          fontSize: 14,
          fontWeight: isActive ? FontWeight.w800 : FontWeight.w600,
          color: const Color(0xFF111827),
        ),
      ),
      subtitle: Row(
        children: [
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
            decoration: BoxDecoration(
              color: account.isHousehold
                  ? AppColors.primary.withValues(alpha: 0.1)
                  : account.isMarketer
                      ? const Color(0xFF8B5CF6).withValues(alpha: 0.12)
                      : const Color(0xFFF59E0B).withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              account.isHousehold
                  ? 'Household'
                  : account.isMarketer
                      ? 'Marketer'
                      : 'Collector',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: account.isHousehold
                    ? AppColors.primary
                    : account.isMarketer
                        ? const Color(0xFF7C3AED)
                        : const Color(0xFFD97706),
              ),
            ),
          ),
          const SizedBox(width: 6),
          Text(
            account.phone,
            style: const TextStyle(
                fontSize: 11, color: Color(0xFF9CA3AF)),
          ),
        ],
      ),
      trailing: isLoading && !isActive
          ? const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : isActive
              ? Text(
                  'Active',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                )
              : Icon(Icons.chevron_right,
                  color: Colors.grey.shade400, size: 20),
    );
  }
}
