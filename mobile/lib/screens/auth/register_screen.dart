import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/app_text_field.dart';
import '../../widgets/loading_button.dart';
import '../../widgets/error_banner.dart';
import '../../services/deep_link/deep_link_service.dart';
import 'dart:html' as html show window, EventListener;

class RegisterScreen extends StatefulWidget {
  final String? initialReferralToken;
  const RegisterScreen({super.key, this.initialReferralToken});

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
  final _referralCodeController = TextEditingController();
  bool _obscurePassword = true;
  
  String _selectedCountryCode = '+237'; // Default to Cameroon
  final List<Map<String, String>> _countries = [
    {'code': '+237', 'name': 'Cameroon', 'flag': '🇨🇲'},
    {'code': '+234', 'name': 'Nigeria', 'flag': '🇳🇬'},
    {'code': '+233', 'name': 'Ghana', 'flag': '🇬🇭'},
    {'code': '+225', 'name': 'Ivory Coast', 'flag': '🇨🇮'},
    {'code': '+221', 'name': 'Senegal', 'flag': '🇸🇳'},
  ];

  html.EventListener? _urlChangeListener;

  @override
  void initState() {
    super.initState();
    // Extract token immediately on web
    if (kIsWeb) {
      _extractReferralTokenFromUrl();
      // Pre-fill from widget parameter if provided
      if (widget.initialReferralToken != null && widget.initialReferralToken!.isNotEmpty) {
        _referralCodeController.text = widget.initialReferralToken!;
        debugPrint('[RegisterScreen] Pre-filled referral token from widget parameter: ${widget.initialReferralToken}');
      }
      // Listen for URL changes (e.g., when user clicks a link while app is open)
      _urlChangeListener = (event) {
        _extractReferralTokenFromUrl();
      };
      html.window.addEventListener('popstate', _urlChangeListener);
      html.window.addEventListener('hashchange', _urlChangeListener);
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Also check on dependency changes (e.g., after navigation)
    if (kIsWeb) {
      _extractReferralTokenFromUrl();
    }
  }

  void _extractReferralTokenFromUrl() {
    if (kIsWeb) {
      try {
        // Use window.location.href for more reliable URL detection on web
        final url = html.window.location.href;
        final uri = Uri.parse(url);
        final token = uri.queryParameters['token'];
        if (token != null && token.isNotEmpty) {
          // Always update the controller with the latest token from URL
          if (_referralCodeController.text != token) {
            _referralCodeController.text = token;
            debugPrint('[RegisterScreen] Extracted referral token from URL: $token');
            debugPrint('[RegisterScreen] Full URL: $url');
          }
        }
      } catch (e) {
        debugPrint('[RegisterScreen] Error extracting token from URL: $e');
      }
    }
  }

  @override
  void dispose() {
    if (kIsWeb && _urlChangeListener != null) {
      html.window.removeEventListener('popstate', _urlChangeListener);
      html.window.removeEventListener('hashchange', _urlChangeListener);
    }
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _referralCodeController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    final deepLinkService = context.read<DeepLinkService>();
    
    // Use manual entry if provided, otherwise use deep link token
    final referralToken = _referralCodeController.text.trim().isNotEmpty
        ? _referralCodeController.text.trim()
        : deepLinkService.pendingReferralToken;
    
    await auth.register(
      name: _nameController.text.trim(),
      phone: '$_selectedCountryCode${_phoneController.text.trim()}',
      password: _passwordController.text,
      role: 'HOUSEHOLD',
      email: _emailController.text.trim().isEmpty
          ? null
          : _emailController.text.trim(),
      countryCode: _selectedCountryCode,
      referralToken: referralToken,
    );

    // Clear the referral token after successful registration
    deepLinkService.clearPendingToken();

    // Navigation is handled by Consumer in main.dart based on auth state
  }

  @override
  Widget build(BuildContext context) {
    // Check URL on every build to catch navigation changes
    if (kIsWeb) {
      _extractReferralTokenFromUrl();
    }
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

                  // Country & Phone
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Country Dropdown
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE5E7EB)),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: ButtonTheme(
                            alignedDropdown: true,
                            child: DropdownButton<String>(
                              value: _selectedCountryCode,
                              isDense: true,
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              borderRadius: BorderRadius.circular(12),
                              items: _countries.map((country) {
                                return DropdownMenuItem<String>(
                                  value: country['code'],
                                  child: Row(
                                    children: [
                                      Text(country['flag']!, style: const TextStyle(fontSize: 20)),
                                      const SizedBox(width: 8),
                                      Text(
                                        country['code']!,
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              }).toList(),
                              onChanged: (value) {
                                if (value != null) {
                                  setState(() {
                                    _selectedCountryCode = value;
                                  });
                                }
                              },
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Phone Field
                      Expanded(
                        child: AppTextField(
                          controller: _phoneController,
                          label: 'Phone Number',
                          hint: '670000000',
                          keyboardType: TextInputType.phone,
                          prefixIcon: const Icon(Icons.phone_outlined, color: AppColors.textHint, size: 22),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'Phone number is required';
                            }
                            // Remove any non-digit characters
                            final digitsOnly = value.trim().replaceAll(RegExp(r'[^0-9]'), '');
                            if (digitsOnly.length < 9) {
                              return 'Enter a valid phone number';
                            }
                            return null;
                          },
                        ),
                      ),
                    ],
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
                  const SizedBox(height: AppSpacing.md),

                  // Referral Code (optional)
                  AppTextField(
                    controller: _referralCodeController,
                    label: 'Referral Code (Optional)',
                    hint: 'Enter referral code if you have one',
                    prefixIcon: const Icon(Icons.card_giftcard_outlined, color: AppColors.textHint, size: 22),
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
