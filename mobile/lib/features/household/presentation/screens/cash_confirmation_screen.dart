import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/app_theme.dart';
import '../../../../providers/job_provider.dart';
import '../../providers/payment_flow_provider.dart';
import '../../providers/payment_flow_enums.dart';
import '../widgets/payment_timeline.dart';

/// Screen 6: Cash Confirmation Screen
/// 
/// Shows timeline and confirms cash payment choice
class CashConfirmationScreen extends StatefulWidget {
  const CashConfirmationScreen({super.key});

  @override
  State<CashConfirmationScreen> createState() => _CashConfirmationScreenState();
}

class _CashConfirmationScreenState extends State<CashConfirmationScreen> {
  bool _isCreatingJob = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leadingWidth: 44,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            color: Color(0xFF111827),
            size: 16,
          ),
          onPressed: _isCreatingJob ? null : () => Navigator.pop(context),
        ),
        title: const Text(
          'Cash Payment',
          style: TextStyle(
            color: Color(0xFF111827),
            fontSize: 13,
            fontWeight: FontWeight.w800,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Column(
          children: [
            const Divider(height: 1, thickness: 1, color: Color(0xFFF0F2F0)),
            Expanded(
              child: Consumer<PaymentFlowProvider>(
                builder: (context, flowProvider, _) {
                  return SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Amount card
                        _buildAmountCard(flowProvider.amountDue),
                        const SizedBox(height: 24),

                        // Cash info card
                        _buildCashInfoCard(),
                        const SizedBox(height: 24),

                        // Timeline
                        Text(
                          'What Happens Next',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Colors.grey.shade800,
                          ),
                        ),
                        const SizedBox(height: 16),
                        PaymentTimeline(
                          type: PaymentTimelineType.cash,
                          currentStep: 0,
                        ),
                        const SizedBox(height: 24),

                        // Info note
                        _buildInfoNote(),
                      ],
                    ),
                  );
                },
              ),
            ),
            _buildConfirmButton(),
          ],
        ),
      ),
    );
  }

  Widget _buildAmountCard(double amount) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        children: [
          const Text(
            'Pay on arrival',
            style: TextStyle(
              fontSize: 14,
              color: Color(0xFF6B7280),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${amount.toStringAsFixed(0)} XAF',
            style: const TextStyle(
              fontSize: 36,
              fontWeight: FontWeight.w800,
              color: Color(0xFF111827),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCashInfoCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFE8F5E9),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Icons.payments_outlined,
                  size: 28,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Cash to Collector',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'You will pay the collector directly when they arrive',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(Icons.info_outline, size: 20, color: AppColors.primary),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Please prepare the exact amount if possible',
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade700,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoNote() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F4F6),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(Icons.check_circle_outline, size: 20, color: AppColors.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'No mobile money payment is needed now. Your pickup request will be sent immediately.',
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey.shade700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildConfirmButton() {
    return Container(
      width: double.infinity,
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                disabledBackgroundColor: AppColors.primary.withOpacity(0.5),
                elevation: 0,
                minimumSize: const Size(double.infinity, 54),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              onPressed: _isCreatingJob ? null : _confirmCashBooking,
              child: _isCreatingJob
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        color: Colors.white,
                      ),
                    )
                  : const Text(
                      'Confirm Booking — Pay Cash',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
            ),
            const SizedBox(height: 12),
            Text(
              'Your pickup request will be sent immediately',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmCashBooking() async {
    setState(() => _isCreatingJob = true);

    try {
      final flowProvider = context.read<PaymentFlowProvider>();
      final jobProvider = context.read<JobProvider>();

      final job = await jobProvider.createJob(
        scheduledDate: flowProvider.scheduledDate!,
        scheduledTime: flowProvider.scheduledTime!,
        locationAddress: flowProvider.fullAddress,
        locationLat: flowProvider.locationLat,
        locationLng: flowProvider.locationLng,
        notes: 'Cash payment on arrival',
        paymentMode: 'CASH',
        paymentMethod: 'CASH',
        paymentRef: null,
        paymentProofUrl: null,
      );

      if (job != null && mounted) {
        flowProvider.setCreatedJob(job);
        flowProvider.setResultType(PaymentResultType.cash);

        Navigator.pushNamedAndRemoveUntil(
          context,
          '/payment-result',
          (route) => route.settings.name == '/home',
          arguments: {
            'resultType': PaymentResultType.cash,
            'job': job,
          },
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create booking: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isCreatingJob = false);
      }
    }
  }
}
