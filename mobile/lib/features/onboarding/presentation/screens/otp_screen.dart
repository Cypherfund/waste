import 'package:flutter/material.dart';
import 'dart:async';
import 'package:provider/provider.dart';
import '../../../../config/app_theme.dart';
import '../../../../services/api/api_client.dart';
import '../../../../services/api/auth_api.dart';

/// Screen 4 — OTP Verification
///
/// Matches mockup exactly: circular back button, left-aligned text,
/// green phone number on new line, and custom numeric keypad.
class OtpScreen extends StatefulWidget {
  final String phoneNumber;
  final VoidCallback onVerified;
  final VoidCallback onBack;
  final String? errorMessage;
  final String? devModeOtp; // Only set when backend returns OTP in dev mode
  final ApiClient apiClient;

  const OtpScreen({
    super.key,
    required this.phoneNumber,
    required this.onVerified,
    required this.onBack,
    this.errorMessage,
    this.devModeOtp,
    required this.apiClient,
  });

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  String _code = "";
  int _resendSeconds = 45;
  Timer? _timer;
  bool _isVerifying = false;
  String? _errorMessage;
  String? _currentDevOtp;
  late final AuthApi _authApi;

  @override
  void initState() {
    super.initState();
    _errorMessage = widget.errorMessage;
    _currentDevOtp = widget.devModeOtp;
    _authApi = AuthApi(widget.apiClient);
    _startTimer();
  }


  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    _resendSeconds = 45;
    _timer?.cancel();
    print('DEBUG: Timer started, _resendSeconds = $_resendSeconds');
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() {
        if (_resendSeconds > 0) {
          _resendSeconds--;
          if (_resendSeconds % 10 == 0) {
            print('DEBUG: Timer tick, _resendSeconds = $_resendSeconds');
          }
        } else {
          print('DEBUG: Timer expired, _resendSeconds = $_resendSeconds');
          t.cancel();
        }
      });
    });
  }

  String _formatTimer(int seconds) {
    final mins = (seconds ~/ 60).toString().padLeft(2, '0');
    final secs = (seconds % 60).toString().padLeft(2, '0');
    return "$mins:$secs";
  }

  void _onKeyTap(String key) {
    if (_code.length < 6) {
      setState(() {
        _code += key;
      });
      if (_code.length == 6) {
        _verify();
      }
    }
  }

  void _onDeleteTap() {
    if (_code.isNotEmpty) {
      setState(() {
        _code = _code.substring(0, _code.length - 1);
      });
    }
  }

  Future<void> _verify() async {
    if (_code.length != 6) return;

    setState(() {
      _isVerifying = true;
      _errorMessage = null;
    });

    try {
      final response = await _authApi.verifyOtp(
        phone: widget.phoneNumber.replaceAll(' ', ''),
        code: _code,
      );

      if (mounted) {
        if (response.success) {
          widget.onVerified();
        } else {
          setState(() {
            _isVerifying = false;
            _errorMessage = response.error ?? 'Verification failed. Please try again.';
            _code = ''; // Clear code for retry
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isVerifying = false;
          _errorMessage = 'Network error. Please try again.';
          _code = '';
        });
      }
    }
  }

  Future<void> _resendCode() async {
    print('DEBUG: Resend code called, _resendSeconds = $_resendSeconds');
    if (_resendSeconds > 0) return;
    print('DEBUG: Calling sendOtp API...');

    setState(() {
      _isVerifying = true;
      _errorMessage = null;
    });

    try {
      final response = await _authApi.sendOtp(
        phone: widget.phoneNumber.replaceAll(' ', ''),
      );

      if (mounted) {
        if (response.success) {
          _startTimer();
          setState(() {
            _isVerifying = false;
            _code = '';
            if (response.otp != null) {
              _currentDevOtp = response.otp;
            }
          });
        } else {
          setState(() {
            _isVerifying = false;
            _errorMessage = response.error ?? 'Failed to send code. Please try again.';
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isVerifying = false;
          String errorMessage = 'Network error. Please try again.';
          if (e.toString().contains('500') || e.toString().contains('Server error')) {
            errorMessage = 'Server error. Please try again later or contact support.';
          }
          _errorMessage = errorMessage;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // Top Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: widget.onBack,
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.arrow_back_ios_new,
                        size: 18,
                        color: Colors.black,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Main Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const SizedBox(height: 24),
                    const Text(
                      'Verify your phone',
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w700,
                        color: Colors.black,
                      ),
                    ),
                    const SizedBox(height: 12),
                    RichText(
                      text: TextSpan(
                        text: 'Enter the 6-digit code we sent to\n',
                        style: const TextStyle(
                          fontSize: 15,
                          color: Colors.black54,
                          height: 1.5,
                        ),
                        children: [
                          TextSpan(
                            text: widget.phoneNumber,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),

                    // OTP Boxes
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: List.generate(6, (i) {
                        final char = i < _code.length ? _code[i] : "";
                        return Container(
                          width: 48,
                          height: 60,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey.shade300),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            char,
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        );
                      }),
                    ),
                    const SizedBox(height: 24),

                    // Timer / Resend
                    Center(
                      child: _resendSeconds > 0
                          ? Text(
                              'Resend code in ${_formatTimer(_resendSeconds)}',
                              style: const TextStyle(
                                fontSize: 14,
                                color: Colors.black54,
                              ),
                            )
                          : TextButton(
                              onPressed: _isVerifying ? null : () {
                                print('DEBUG: Resend Code tapped');
                                _resendCode();
                              },
                              style: TextButton.styleFrom(
                                foregroundColor: AppColors.primary,
                                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  side: BorderSide(color: AppColors.primary),
                                ),
                              ),
                              child: const Text(
                                'Resend Code',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                    ),

                    if (_isVerifying) ...[
                      const SizedBox(height: 16),
                      const Center(
                        child: CircularProgressIndicator(
                          color: AppColors.primary,
                          strokeWidth: 2,
                        ),
                      ),
                    ],

                    const SizedBox(height: 24),

                    // Dev Mode OTP Banner (only shown when backend returns OTP)
                    if (_currentDevOtp != null) ...[
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.orange.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.orange.shade300, width: 2),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.developer_mode,
                                  color: Colors.orange.shade700,
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'DEV MODE',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.orange.shade700,
                                    letterSpacing: 1,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Your verification code is:',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.orange.shade800,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _currentDevOtp!,
                              style: TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.w800,
                                color: Colors.orange.shade800,
                                letterSpacing: 8,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],

                    // Error message
                    if (_errorMessage != null) ...[
                      const SizedBox(height: 16),
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
                    ],

                    if (_isVerifying) ...[
                      const SizedBox(height: 24),
                      const Center(
                        child: CircularProgressIndicator(
                          color: AppColors.primary,
                          strokeWidth: 2,
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),

            // Custom Keypad
            Container(
              color: const Color(0xFFF0F1F5),
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
              child: Column(
                children: [
                  _buildKeypadRow(['1', '2', '3']),
                  _buildKeypadRow(['4', '5', '6']),
                  _buildKeypadRow(['7', '8', '9']),
                  _buildKeypadRow(['', '0', 'delete']),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildKeypadRow(List<String> keys) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: keys.map((key) => _buildKey(key)).toList(),
      ),
    );
  }

  Widget _buildKey(String key) {
    if (key.isEmpty) return const Expanded(child: SizedBox());

    final isDelete = key == 'delete';

    return Expanded(
      child: GestureDetector(
        onTap: isDelete ? _onDeleteTap : () => _onKeyTap(key),
        child: Container(
          height: 52,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(8),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                offset: const Offset(0, 1),
                blurRadius: 1,
              ),
            ],
          ),
          alignment: Alignment.center,
          child: isDelete
              ? const Icon(Icons.backspace_outlined, size: 22)
              : Text(
                  key,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w500,
                  ),
                ),
        ),
      ),
    );
  }
}
