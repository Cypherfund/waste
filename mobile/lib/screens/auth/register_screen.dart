import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/app_text_field.dart';
import '../../widgets/loading_button.dart';
import '../../widgets/error_banner.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    await auth.register(
      name: _nameController.text.trim(),
      phone: _phoneController.text.trim(),
      password: _passwordController.text,
      email: _emailController.text.trim().isEmpty
          ? null
          : _emailController.text.trim(),
    );

    if (mounted && auth.isAuthenticated) {
      if (auth.user?.isCollector == true) {
        Navigator.pushReplacementNamed(context, '/collector-home');
      } else {
        Navigator.pushReplacementNamed(context, '/home');
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
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo & Heading
                  _buildHeader(),
                  const SizedBox(height: AppSpacing.xl),

                  // Error
                  if (auth.error != null)
                    ErrorBanner(
                      message: auth.error!,
                      onDismiss: auth.clearError,
                    ),

                  // Name
                  AppTextField(
                    controller: _nameController,
                    label: 'Full Name',
                    hint: 'Enter your full name',
                    prefixIcon: const Icon(Icons.person_outline, color: AppColors.textHint, size: 22),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Name is required';
                      }
                      if (value.trim().length < 2) {
                        return 'Name must be at least 2 characters';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // Phone
                  AppTextField(
                    controller: _phoneController,
                    label: 'Phone Number',
                    hint: '+237670000000',
                    keyboardType: TextInputType.phone,
                    prefixIcon: const Icon(Icons.phone_outlined, color: AppColors.textHint, size: 22),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Phone number is required';
                      }
                      if (!RegExp(r'^\+237[0-9]{9}$').hasMatch(value.trim())) {
                        return 'Enter a valid Cameroon number (+237XXXXXXXXX)';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // Email
                  AppTextField(
                    controller: _emailController,
                    label: 'Email (optional)',
                    hint: 'john@example.com',
                    keyboardType: TextInputType.emailAddress,
                    prefixIcon: const Icon(Icons.email_outlined, color: AppColors.textHint, size: 22),
                    validator: (value) {
                      if (value != null && value.trim().isNotEmpty) {
                        if (!RegExp(r'^[^@]+@[^@]+\.[^@]+$').hasMatch(value.trim())) {
                          return 'Enter a valid email address';
                        }
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // Password
                  AppTextField(
                    controller: _passwordController,
                    label: 'Password',
                    obscureText: _obscurePassword,
                    prefixIcon: const Icon(Icons.lock_outline, color: AppColors.textHint, size: 22),
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
                      if (value.length < 8) {
                        return 'Password must be at least 8 characters';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // Confirm Password
                  AppTextField(
                    controller: _confirmPasswordController,
                    label: 'Confirm Password',
                    obscureText: true,
                    prefixIcon: const Icon(Icons.lock_outline, color: AppColors.textHint, size: 22),
                    validator: (value) {
                      if (value != _passwordController.text) {
                        return 'Passwords do not match';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  // Register button
                  LoadingButton(
                    label: 'Create Account',
                    isLoading: auth.isLoading,
                    onPressed: _handleRegister,
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // Login link
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'Already have an account? ',
                        style: AppTypography.body.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      GestureDetector(
                        onTap: () => Navigator.pushReplacementNamed(context, '/login'),
                        child: Text(
                          'Sign In',
                          style: AppTypography.bodyMedium.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: AppColors.primarySurface,
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Icon(
            Icons.eco,
            size: 36,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        Text(
          'Create Account',
          style: AppTypography.heading1,
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          'Join KmerTrash and start managing waste',
          textAlign: TextAlign.center,
          style: AppTypography.body.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }
}
