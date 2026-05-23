import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../models/saved_account.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/app_text_field.dart';
import '../../widgets/loading_button.dart';
import '../../widgets/error_banner.dart';
import '../../features/onboarding/onboarding_flow.dart';
import '../../main.dart' show appNavigatorKey;

class LoginScreen extends StatefulWidget {
  final VoidCallback? onSignUp;
  final bool addAccountMode;

  const LoginScreen({
    super.key,
    this.onSignUp,
    this.addAccountMode = false,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      // Load saved accounts from storage so profiles show up after logout
      auth.loadSavedAccountsIfNeeded();
      final msg = auth.sessionExpiredMessage;
      if (msg != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            backgroundColor: const Color(0xFFDC2626),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 4),
          ),
        );
        auth.clearSessionExpiredMessage();
      }
    });
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    await auth.login(
      phone: '+237${_phoneController.text.trim()}',
      password: _passwordController.text,
    );

    if (auth.status == AuthStatus.authenticated) {
      if (widget.addAccountMode) {
        // Account is auto-saved by AuthProvider; just pop back to profile
        if (mounted) Navigator.pop(context);
        return;
      }
      await markOnboardingCompleted();
      if (mounted) {
        String route;
        if (auth.user?.isCollector == true) {
          route = '/collector-home';
        } else if (auth.user?.isMarketer == true) {
          route = '/marketer-home';
        } else {
          route = '/home';
        }
        Navigator.pushNamedAndRemoveUntil(context, route, (r) => false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo & Branding
                  _buildLogo(),
                  const SizedBox(height: AppSpacing.xl),

                  // Error
                  if (auth.error != null)
                    ErrorBanner(
                      message: auth.error!,
                      onDismiss: auth.clearError,
                    ),

                  // Phone field
                  AppTextField(
                    controller: _phoneController,
                    label: 'Phone Number',
                    hint: '654321233',
                    keyboardType: TextInputType.phone,
                    prefixIcon: const Padding(
                      padding: EdgeInsets.only(left: 12),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('🇨🇲', style: TextStyle(fontSize: 20)),
                          SizedBox(width: 4),
                          Text(
                            '+237',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          SizedBox(width: 8),
                          SizedBox(
                            height: 24,
                            child: VerticalDivider(
                              color: AppColors.border,
                              thickness: 1,
                              width: 1,
                            ),
                          ),
                        ],
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Phone number is required';
                      }
                      if (!RegExp(r'^[0-9]{9}$').hasMatch(value.trim())) {
                        return 'Enter a valid phone number (9 digits)';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // Password field
                  AppTextField(
                    controller: _passwordController,
                    label: 'Password',
                    obscureText: _obscurePassword,
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                        color: AppColors.textHint,
                        size: 22,
                      ),
                      onPressed: () {
                        setState(() => _obscurePassword = !_obscurePassword);
                      },
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Password is required';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  // Sign In button
                  LoadingButton(
                    label: 'Sign In',
                    isLoading: auth.isLoading,
                    onPressed: _handleLogin,
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  // Trust message
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.shield_outlined, size: 16, color: AppColors.textSecondary),
                      const SizedBox(width: 6),
                      Text(
                        'Your information is safe with us',
                        style: AppTypography.caption,
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xl),

                  // Register link
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        "Don't have an account? ",
                        style: AppTypography.body.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      GestureDetector(
                        onTap: () {
                          if (widget.onSignUp != null) {
                            widget.onSignUp!();
                          } else {
                            Navigator.pushNamed(context, '/register');
                          }
                        },
                        child: Text(
                          'Sign Up',
                          style: AppTypography.bodyMedium.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),

                  // Saved profiles section
                  if (!widget.addAccountMode && auth.savedAccounts.isNotEmpty) ..._buildSavedAccounts(auth),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildSavedAccounts(AuthProvider auth) {
    return [
      const SizedBox(height: 28),
      Row(
        children: [
          const Expanded(child: Divider()),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text(
              'or continue as',
              style: AppTypography.caption.copyWith(color: AppColors.textSecondary),
            ),
          ),
          const Expanded(child: Divider()),
        ],
      ),
      const SizedBox(height: 16),
      ...auth.savedAccounts.map((account) => _SavedAccountTile(
        account: account,
        isThisSwitching: auth.switchingAccountId == account.id,
        isSwitchingAny: auth.isSwitching,
        onTap: () async {
          await auth.switchAccount(account);
          if (auth.status == AuthStatus.authenticated) {
            await markOnboardingCompleted();
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
        },
      )),
    ];
  }

  Widget _buildLogo() {
    return Column(
      children: [
        // Logo image
        Image.asset(
          'assets/images/logo.png',
          width: 120,
          height: 120,
          fit: BoxFit.contain,
        ),
        const SizedBox(height: AppSpacing.md),
        Text(
          'KmerTrash',
          style: AppTypography.heading1.copyWith(
            color: AppColors.primary,
            fontSize: 28,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          'Collect. Clean. Earn. Together.',
          style: AppTypography.body.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }
}

class _SavedAccountTile extends StatelessWidget {
  final SavedAccount account;
  final bool isThisSwitching;
  final bool isSwitchingAny;
  final VoidCallback onTap;

  const _SavedAccountTile({
    required this.account,
    required this.isThisSwitching,
    required this.isSwitchingAny,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: isSwitchingAny ? null : onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE5E7EB)),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: account.isHousehold
                    ? AppColors.primary.withValues(alpha: 0.12)
                    : const Color(0xFFF59E0B).withValues(alpha: 0.15),
                child: Text(
                  account.initials,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: account.isHousehold
                        ? AppColors.primary
                        : const Color(0xFFF59E0B),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      account.name,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF111827),
                      ),
                    ),
                    Text(
                      '${account.isHousehold ? 'Household' : 'Collector'} · ${account.phone}',
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF9CA3AF),
                      ),
                    ),
                  ],
                ),
              ),
              if (isThisSwitching)
                const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              else
                Icon(Icons.arrow_forward_ios_rounded,
                    size: 14,
                    color: isSwitchingAny ? Colors.grey.shade200 : Colors.grey.shade400),
            ],
          ),
        ),
      ),
    );
  }
}
