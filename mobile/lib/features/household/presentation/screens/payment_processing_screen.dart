import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/app_theme.dart';
import '../../../../services/api/wallet_api.dart';
import '../../providers/payment_flow_provider.dart';
import '../../providers/payment_flow_enums.dart';

/// Screen 3b: Payment Processing
/// 
/// Shows loading state while payment is being processed
/// Polls payment status and handles success/failure states
class PaymentProcessingScreen extends StatefulWidget {
  const PaymentProcessingScreen({super.key});

  @override
  State<PaymentProcessingScreen> createState() => _PaymentProcessingScreenState();
}

class _PaymentProcessingScreenState extends State<PaymentProcessingScreen> {
  Timer? _pollingTimer;
  bool _isCancelled = false;
  static const Duration _pollingInterval = Duration(seconds: 3);
  static const Duration _maxPollingDuration = Duration(minutes: 5);
  int _elapsedSeconds = 0;

  @override
  void initState() {
    super.initState();
    _startPolling();
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  void _startPolling() {
    // Start elapsed time counter
    Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() {
        _elapsedSeconds++;
      });

      // Check for timeout
      if (_elapsedSeconds >= _maxPollingDuration.inSeconds) {
        timer.cancel();
        _handleTimeout();
      }
    });

    // Start polling for payment status
    _pollPaymentStatus();
  }

  Future<void> _pollPaymentStatus() async {
    final flowProvider = context.read<PaymentFlowProvider>();
    final providerTransactionId = flowProvider.providerTransactionId;

    if (providerTransactionId == null) {
      // No transaction ID, simulate for demo
      await Future.delayed(const Duration(seconds: 3));
      if (!mounted || _isCancelled) return;
      _handlePaymentSuccess();
      return;
    }

    // Poll actual payment status
    _pollingTimer = Timer.periodic(_pollingInterval, (timer) async {
      if (!mounted || _isCancelled) {
        timer.cancel();
        return;
      }

      try {
        // TODO: Replace with actual API call to check payment status
        // final status = await WalletApi().checkPaymentStatus(providerTransactionId);
        
        // For demo, simulate successful payment after 3 polls
        final pollCount = _elapsedSeconds ~/ _pollingInterval.inSeconds;
        if (pollCount >= 1) {
          timer.cancel();
          if (!mounted || _isCancelled) return;
          _handlePaymentSuccess();
        }
      } catch (e) {
        if (!mounted) return;
        timer.cancel();
        _handlePaymentError(e.toString());
      }
    });
  }

  void _handlePaymentSuccess() {
    final flowProvider = context.read<PaymentFlowProvider>();
    final isSubscription = flowProvider.isSubscriptionContext;
    Navigator.pushReplacementNamed(
      context,
      '/payment-result',
      arguments: {
        'resultType': PaymentResultType.success,
        'isSubscription': isSubscription,
        if (!isSubscription) 'job': flowProvider.createdJob,
      },
    );
  }

  void _handlePaymentError(String error) {
    final flowProvider = context.read<PaymentFlowProvider>();
    final isSubscription = flowProvider.isSubscriptionContext;
    Navigator.pushReplacementNamed(
      context,
      '/payment-result',
      arguments: {
        'resultType': PaymentResultType.failed,
        'isSubscription': isSubscription,
        'failureReason': error,
        if (!isSubscription) 'job': flowProvider.createdJob,
      },
    );
  }

  void _handleTimeout() {
    final flowProvider = context.read<PaymentFlowProvider>();
    final isSubscription = flowProvider.isSubscriptionContext;
    Navigator.pushReplacementNamed(
      context,
      '/payment-result',
      arguments: {
        'resultType': PaymentResultType.failed,
        'isSubscription': isSubscription,
        'failureReason': 'Payment timed out. Please try again.',
        if (!isSubscription) 'job': flowProvider.createdJob,
      },
    );
  }

  void _cancelPayment() {
    setState(() => _isCancelled = true);
    _pollingTimer?.cancel();
    Navigator.pop(context);
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
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

              return Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Animated loading indicator
                  SizedBox(
                    width: 80,
                    height: 80,
                    child: CircularProgressIndicator(
                      strokeWidth: 3,
                      valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Processing text
                  const Text(
                    'Processing Payment',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF111827),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Provider name
                  Text(
                    'via $providerName',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade600,
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Info text
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 40),
                    child: Text(
                      'Please wait while we process your payment. Do not close this page.',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade500,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 48),

                  // Cancel button
                  TextButton(
                    onPressed: _cancelPayment,
                    child: Text(
                      'Cancel',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ),

                  const SizedBox(height: 8),

                  // Elapsed time
                  Text(
                    'Elapsed: ${_formatDuration(Duration(seconds: _elapsedSeconds))}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade400,
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}
