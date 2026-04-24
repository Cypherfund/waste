import 'package:flutter/material.dart';
import 'dart:async';
import '../../../../config/app_theme.dart';

/// Screen 4 — OTP Verification
///
/// Matches mockup exactly: circular back button, left-aligned text,
/// green phone number on new line, and custom numeric keypad.
class OtpScreen extends StatefulWidget {
  final String phoneNumber;
  final VoidCallback onVerified;
  final VoidCallback onBack;

  const OtpScreen({
    super.key,
    required this.phoneNumber,
    required this.onVerified,
    required this.onBack,
  });

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  String _code = "";
  int _resendSeconds = 45;
  Timer? _timer;
  bool _isVerifying = false;

  @override
  void initState() {
    super.initState();
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
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() {
        if (_resendSeconds > 0) {
          _resendSeconds--;
        } else {
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
    setState(() => _isVerifying = true);
    // Simulate verification delay
    await Future.delayed(const Duration(milliseconds: 1000));
    if (mounted) {
      setState(() => _isVerifying = false);
      widget.onVerified();
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
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
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
                    const Text(
                      'Enter the 6-digit code we sent to',
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.black54,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      widget.phoneNumber,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
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
                    const SizedBox(height: 32),

                    // Timer
                    Center(
                      child: Text(
                        _resendSeconds > 0
                            ? 'Resend code in ${_formatTimer(_resendSeconds)}'
                            : 'Resend Code',
                        style: TextStyle(
                          fontSize: 14,
                          color: _resendSeconds > 0
                              ? Colors.black54
                              : AppColors.primary,
                          fontWeight: _resendSeconds > 0
                              ? FontWeight.normal
                              : FontWeight.w600,
                        ),
                      ),
                    ),
                    
                    if (_isVerifying) ...[
                      const SizedBox(height: 24),
                      const Center(
                        child: CircularProgressIndicator(
                          color: AppColors.primary,
                          strokeWidth: 2,
                        ),
                      ),
                    ],
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
                color: Colors.black.withOpacity(0.05),
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
