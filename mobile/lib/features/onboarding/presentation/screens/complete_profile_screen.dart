import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/app_theme.dart';
import '../../../../providers/auth_provider.dart';
import '../../onboarding_flow.dart';

/// Screen 5 — Complete Profile
///
/// Collects Name and Password to finalize registration.
class CompleteProfileScreen extends StatefulWidget {
  final String phone;
  final UserRole role;
  final VoidCallback onComplete;
  final VoidCallback onBack;

  const CompleteProfileScreen({
    super.key,
    required this.phone,
    required this.role,
    required this.onComplete,
    required this.onBack,
  });

  @override
  State<CompleteProfileScreen> createState() => _CompleteProfileScreenState();
}

class _CompleteProfileScreenState extends State<CompleteProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _nameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    final roleString = widget.role == UserRole.collector ? 'COLLECTOR' : 'HOUSEHOLD';

    debugPrint('CompleteProfileScreen: Submitting registration for ${widget.phone} with role $roleString');
    
    await auth.register(
      name: _nameController.text.trim(),
      phone: widget.phone,
      password: _passwordController.text,
      role: roleString,
    );

    if (!mounted) return;

    if (auth.isAuthenticated) {
      debugPrint('CompleteProfileScreen: Registration successful, triggering onComplete');
      widget.onComplete();
    } else {
      debugPrint('CompleteProfileScreen: Registration did not result in authentication. Error: ${auth.error}');
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Back button
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
              child: IconButton(
                onPressed: widget.onBack,
                icon: const Icon(
                  Icons.arrow_back_ios_new,
                  size: 20,
                  color: Colors.black87,
                ),
              ),
            ),

            // Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 20),

                      const Text(
                        'Complete your\nprofile',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                          height: 1.2,
                          letterSpacing: -0.5,
                          color: Colors.black,
                        ),
                      ),
                      const SizedBox(height: 12),

                      Text(
                        "Just a few more details to get started.",
                        style: TextStyle(
                          fontSize: 15,
                          color: Colors.grey.shade600,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Error Banner
                      if (auth.error != null) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.red.shade100),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.error_outline, color: Colors.red, size: 20),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  auth.error!,
                                  style: const TextStyle(color: Colors.red, fontSize: 13),
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.close, size: 16, color: Colors.red),
                                onPressed: auth.clearError,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),
                      ],

                      // Name Field
                      _buildTextField(
                        controller: _nameController,
                        label: 'Full Name',
                        hint: 'Enter your name',
                        icon: Icons.person_outline,
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return 'Name is required';
                          if (v.trim().length < 2) return 'Name is too short';
                          return null;
                        },
                      ),
                      const SizedBox(height: 20),

                      // Password Field
                      _buildTextField(
                        controller: _passwordController,
                        label: 'Password',
                        hint: 'Create a password',
                        icon: Icons.lock_outline,
                        obscureText: _obscurePassword,
                        suffix: IconButton(
                          icon: Icon(
                            _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                            size: 20,
                            color: Colors.grey,
                          ),
                          onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                        ),
                        validator: (v) {
                          if (v == null || v.isEmpty) return 'Password is required';
                          if (v.length < 8) return 'At least 8 characters';
                          return null;
                        },
                      ),
                      const SizedBox(height: 32),

                      // Finish Button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: auth.isLoading ? null : _submit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            elevation: 4,
                          ),
                          child: auth.isLoading
                              ? const SizedBox(
                                  width: 24,
                                  height: 24,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Text(
                                  'Finish Registration',
                                  style: TextStyle(fontSize: 16, color: Colors.white),
                                ),
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    bool obscureText = false,
    Widget? suffix,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          obscureText: obscureText,
          validator: validator,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 15),
            prefixIcon: Icon(icon, size: 20, color: Colors.grey.shade500),
            suffixIcon: suffix,
            filled: true,
            fillColor: const Color(0xFFF8F9F8),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey.shade200),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey.shade200),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Colors.red, width: 1),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          ),
        ),
      ],
    );
  }
}
