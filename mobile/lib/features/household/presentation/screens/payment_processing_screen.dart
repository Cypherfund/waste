import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/app_theme.dart';
import '../../../../services/api/wallet_api.dart';
import '../../providers/payment_flow_provider.dart';
import '../../providers/payment_flow_enums.dart';

/// Screen 3b: Payment Processing
///
/// Polls GET /payments/:txId/status every 5 s for up to 180 s.
/// Navigates to PaymentResultScreen on success, failure, or timeout.
class PaymentProcessingScreen extends StatefulWidget {
  const PaymentProcessingScreen({super.key});

  @override
  State<PaymentProcessingScreen> createState() => _PaymentProcessingScreenState();
}

class _PaymentProcessingScreenState extends State<PaymentProcessingScreen> {
  Timer? _pollTimer;
  Timer? _elapsedTimer;
  bool _hasNavigated = false;
  bool _isDisposed = false;

  static const int _pollIntervalSeconds = 5;
  static const int _maxDurationSeconds = 180;

  int _elapsedSeconds = 0;
  int _pollAttempts = 0;
  static const int _maxAttempts = _maxDurationSeconds ~/ _pollIntervalSeconds; // 36

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _start());
  }

  @override
  void dispose() {
    _isDisposed = true;
    _pollTimer?.cancel();
    _elapsedTimer?.cancel();
    super.dispose();
  }

  void _start() {
    _elapsedTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_isDisposed) return;
      setState(() => _elapsedSeconds++);
    });

    _pollTimer = Timer.periodic(
      const Duration(seconds: _pollIntervalSeconds),
      (_) => _poll(),
    );

    // Run first poll immediately
    _poll();
  }

  Future<void> _poll() async {
    if (_isDisposed || _hasNavigated) return;

    _pollAttempts++;

    if (_pollAttempts > _maxAttempts) {
      _stopTimers();
      _navigate(PaymentResultType.pending);
      return;
    }

    final flowProvider = context.read<PaymentFlowProvider>();
    final txId = flowProvider.linkedTransactionId;
    final jobId = flowProvider.createdJob?.id;
    final walletApi = context.read<WalletApi>();

    try {
      PaymentTransaction? tx;

      if (txId != null) {
        tx = await walletApi.checkTransactionStatus(txId);
      } else if (jobId != null) {
        tx = await walletApi.getLatestJobTransaction(jobId);
      } else {
        // No txId and no jobId — go to pending
        _stopTimers();
        _navigate(PaymentResultType.pending);
        return;
      }

      if (_isDisposed || _hasNavigated) return;

      if (tx == null) return; // Still waiting, keep polling

      final status = tx.status.toUpperCase();
      if (status == 'SUCCESS' || status == 'VERIFIED' || status == 'COMPLETED') {
        _stopTimers();
        _navigate(PaymentResultType.success);
      } else if (status == 'FAILED' || status == 'REJECTED' || status == 'CANCELLED') {
        _stopTimers();
        _navigate(PaymentResultType.failed);
      }
      // PENDING / AWAITING_ADMIN_VERIFICATION → keep polling
    } catch (_) {
      // Network error — keep polling, don't fail immediately
    }
  }

  void _stopTimers() {
    _pollTimer?.cancel();
    _elapsedTimer?.cancel();
  }

  void _navigate(PaymentResultType resultType) {
    if (_hasNavigated || !mounted) return;
    _hasNavigated = true;
    final flowProvider = context.read<PaymentFlowProvider>();
    Navigator.pushReplacementNamed(
      context,
      '/payment-result',
      arguments: {
        'resultType': resultType,
        'isSubscription': flowProvider.isSubscriptionContext,
        'isWalletTopUp': flowProvider.isWalletTopUpContext,
        'job': flowProvider.createdJob,
        'amount': flowProvider.walletTopUpAmount,
      },
    );
  }

  void _checkLater() {
    _stopTimers();
    _navigate(PaymentResultType.pending);
  }

  String _formatElapsed() {
    final m = _elapsedSeconds ~/ 60;
    final s = _elapsedSeconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: Consumer<PaymentFlowProvider>(
            builder: (context, flowProvider, _) {
              final providerName = flowProvider.selectedProviderName ?? 'Payment Provider';

              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 40),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(
                      width: 80,
                      height: 80,
                      child: CircularProgressIndicator(
                        strokeWidth: 3,
                        valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                      ),
                    ),
                    const SizedBox(height: 32),

                    const Text(
                      'Processing Payment',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF111827),
                      ),
                    ),
                    const SizedBox(height: 8),

                    Text(
                      'via $providerName',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 20),

                    Text(
                      'Check your phone for a payment prompt.',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade500,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 6),

                    Text(
                      'This may take a few moments.',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade400,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 48),

                    TextButton(
                      onPressed: _checkLater,
                      child: Text(
                        "I'll check later",
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),

                    Text(
                      _formatElapsed(),
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade400,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
