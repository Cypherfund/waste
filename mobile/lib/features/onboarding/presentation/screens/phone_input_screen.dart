import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/app_theme.dart';
import '../../../../services/api/countries_api.dart';
import '../../../../services/api/api_client.dart';
import '../../../../services/api/auth_api.dart';
import '../../../../providers/countries_provider.dart';

class PhoneInputScreen extends StatefulWidget {
  final String? initialPhone;
  final String initialCountryCode;
  final String? errorMessage;
  // callback delivers phone prefix (e.g. "+237") AND the ISO country code (e.g. "cmr")
  final void Function(String phone, String phonePrefix, String countryCode, String? errorMessage, String? devModeOtp) onSendCode;
  final VoidCallback onBack;

  const PhoneInputScreen({
    super.key,
    this.initialPhone,
    this.initialCountryCode = '+237',
    this.errorMessage,
    required this.onSendCode,
    required this.onBack,
  });

  @override
  State<PhoneInputScreen> createState() => _PhoneInputScreenState();
}

class _PhoneInputScreenState extends State<PhoneInputScreen> {
  late final TextEditingController _phoneController;
  String _selectedPrefix = '+237';
  String _selectedCountryCode = 'cmr';
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _phoneController = TextEditingController(text: widget.initialPhone ?? '');
    _selectedPrefix = widget.initialCountryCode;
    _errorMessage = widget.errorMessage;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CountriesProvider>().loadCountries();
    });
  }

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();

    setState(() => _isLoading = true);

    try {
      final fullPhone = '$_selectedPrefix${_phoneController.text.trim()}';
      final authApi = AuthApi(context.read<ApiClient>());
      final response = await authApi.sendOtp(phone: fullPhone);

      if (mounted) {
        if (response.success) {
          widget.onSendCode(
            _phoneController.text.trim(),
            _selectedPrefix,
            _selectedCountryCode,
            null,
            response.otp, // Pass dev mode OTP if returned
          );
        } else {
          setState(() => _isLoading = false);
          widget.onSendCode(
            _phoneController.text.trim(),
            _selectedPrefix,
            _selectedCountryCode,
            response.error ?? 'Failed to send code. Please try again.',
            null,
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        widget.onSendCode(
          _phoneController.text.trim(),
          _selectedPrefix,
          _selectedCountryCode,
          'Network error. Please check your connection and try again.',
          null,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Form(
          key: _formKey,
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

              // Scrollable content
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 20),

                      const Text(
                        'Enter your\nphone number',
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
                        "We'll send you a code to verify.",
                        style: TextStyle(
                          fontSize: 15,
                          color: Colors.grey.shade600,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 32),

                      _buildPhoneInput(),
                      const SizedBox(height: 28),

                      // Error message
                      if (_errorMessage != null) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.red.shade200),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.error_outline, color: Colors.red.shade600, size: 18),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _errorMessage!,
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.red.shade700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      _buildSendButton(),
                      const SizedBox(height: 40),

                      _buildTrustBadge(),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ---------------- PHONE INPUT ----------------
  Widget _buildPhoneInput() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: _showCountryPicker,
            child: Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 14, vertical: 16),
              decoration: BoxDecoration(
                border: Border(
                  right: BorderSide(color: Colors.grey.shade300),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(_flagForCode(_selectedPrefix),
                      style: const TextStyle(fontSize: 22)),
                  const SizedBox(width: 6),
                  Text(
                    _selectedPrefix,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Icon(Icons.keyboard_arrow_down,
                      size: 18, color: Colors.grey.shade500),
                ],
              ),
            ),
          ),
          Expanded(
            child: TextFormField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              style: const TextStyle(
                fontSize: 16,
                letterSpacing: 1,
                color: Colors.black87,
              ),
              decoration: InputDecoration(
                hintText: '6XX XXX XXX',
                hintStyle: TextStyle(
                    color: Colors.grey.shade400, letterSpacing: 1),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(
                    horizontal: 14, vertical: 16),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Phone number is required';
                }
                if (value.trim().length < 8) {
                  return 'Enter a valid phone number';
                }
                return null;
              },
            ),
          ),
        ],
      ),
    );
  }

  // ---------------- SEND BUTTON ----------------
  Widget _buildSendButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: _isLoading ? null : _submit,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          disabledBackgroundColor: AppColors.primary.withOpacity(0.6),
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          elevation: 4,
        ),
        child: _isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : const Text(
                'Send Code',
                style: TextStyle(fontSize: 16, color: Colors.white),
              ),
      ),
    );
  }

  // ---------------- TRUST BADGE ----------------
  Widget _buildTrustBadge() {
    return Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.verified_user_outlined,
              size: 18, color: AppColors.primary),
          const SizedBox(width: 8),
          Text(
            'Your number is safe with us',
            style: TextStyle(
                fontSize: 13, color: Colors.grey.shade500),
          ),
        ],
      ),
    );
  }

  // ---------------- COUNTRY PICKER ----------------
  void _showCountryPicker() {
    final countries = context.read<CountriesProvider>().countries;
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Container(
              width: 40, height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            const Text('Select Country',
                style: TextStyle(
                    fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            ...countries.map((country) {
              final isSelected = country.phonePrefix == _selectedPrefix;
              return ListTile(
                leading: Text(country.flagEmoji ?? '🏳️',
                    style: const TextStyle(fontSize: 24)),
                title: Text(country.countryName,
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w500)),
                trailing: Text(country.phonePrefix,
                    style: TextStyle(
                      fontSize: 14,
                      color: isSelected
                          ? AppColors.primary
                          : Colors.grey.shade500,
                      fontWeight: isSelected
                          ? FontWeight.w700
                          : FontWeight.w400,
                    )),
                selected: isSelected,
                selectedTileColor: AppColors.primarySurface,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
                onTap: () {
                  setState(() {
                    _selectedPrefix = country.phonePrefix;
                    _selectedCountryCode = country.countryCode;
                  });
                  Navigator.pop(ctx);
                },
              );
            }).toList(),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  String _flagForCode(String prefix) {
    final countries = context.read<CountriesProvider>().countries;
    final match = countries.where((c) => c.phonePrefix == prefix).firstOrNull;
    return match?.flagEmoji ?? '🏳️';
  }
}
