import 'package:flutter/material.dart';
import '../../../../config/app_theme.dart';
import '../../../../models/job.dart';

/// Timeline widget showing payment and pickup progress
class PaymentTimeline extends StatelessWidget {
  final Job? job;
  final PaymentTimelineType type;
  final int currentStep;

  const PaymentTimeline({
    super.key,
    this.job,
    this.type = PaymentTimelineType.full,
    this.currentStep = 0,
  });

  factory PaymentTimeline.forJob(Job job) {
    PaymentTimelineType timelineType;
    int step = 0;

    // Determine timeline type based on payment mode and status
    if (job.paymentMode == 'CASH') {
      timelineType = PaymentTimelineType.cash;
      step = _getCashStep(job);
    } else if (job.paymentMode == 'MANUAL_PROVIDER' || 
               job.paymentMode == 'INTEGRATED_PROVIDER') {
      if (job.status == JobStatus.paymentPending ||
          job.paymentStatus == 'AWAITING_ADMIN_VERIFICATION' ||
          job.paymentStatus == 'PROVIDER_PENDING') {
        timelineType = PaymentTimelineType.paymentPending;
        step = _getPaymentPendingStep(job);
      } else {
        timelineType = PaymentTimelineType.full;
        step = _getStandardStep(job);
      }
    } else {
      timelineType = PaymentTimelineType.full;
      step = _getStandardStep(job);
    }

    return PaymentTimeline(
      job: job,
      type: timelineType,
      currentStep: step,
    );
  }

  static int _getCashStep(Job job) {
    switch (job.status) {
      case JobStatus.requested:
        return 0;
      case JobStatus.assigned:
        return 1;
      case JobStatus.inProgress:
        return 2;
      case JobStatus.completed:
        return 3;
      case JobStatus.validated:
        return 4;
      default:
        return 0;
    }
  }

  static int _getPaymentPendingStep(Job job) {
    if (job.paymentStatus == 'AWAITING_ADMIN_VERIFICATION' ||
        job.paymentStatus == 'PROVIDER_PENDING') {
      return 1;
    }
    return _getStandardStep(job);
  }

  static int _getStandardStep(Job job) {
    switch (job.status) {
      case JobStatus.paymentPending:
        return 0;
      case JobStatus.paymentFailed:
        return 0;
      case JobStatus.requested:
        return 1;
      case JobStatus.assigned:
        return 2;
      case JobStatus.inProgress:
        return 3;
      case JobStatus.completed:
        return 4;
      case JobStatus.validated:
        return 5;
      default:
        return 0;
    }
  }

  @override
  Widget build(BuildContext context) {
    final steps = _getSteps();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (type == PaymentTimelineType.cash)
          _buildCashNote(),
        const SizedBox(height: 16),
        ...List.generate(steps.length, (index) {
          return _buildStepItem(
            step: steps[index],
            index: index,
            isLast: index == steps.length - 1,
          );
        }),
      ],
    );
  }

  Widget _buildCashNote() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFE8F5E9),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(
            Icons.info_outline,
            size: 18,
            color: AppColors.primary,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Please prepare exact change if possible',
              style: TextStyle(
                fontSize: 13,
                color: AppColors.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepItem({
    required TimelineStep step,
    required int index,
    required bool isLast,
  }) {
    final isCompleted = index < currentStep;
    final isCurrent = index == currentStep;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Step indicator column
        Column(
          children: [
            // Step circle
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: isCompleted 
                    ? AppColors.primary 
                    : isCurrent 
                        ? AppColors.primary.withOpacity(0.1)
                        : Colors.grey.shade200,
                shape: BoxShape.circle,
                border: Border.all(
                  color: isCompleted || isCurrent 
                      ? AppColors.primary 
                      : Colors.grey.shade300,
                  width: 2,
                ),
              ),
              child: Center(
                child: isCompleted
                    ? const Icon(
                        Icons.check,
                        size: 16,
                        color: Colors.white,
                      )
                    : isCurrent
                        ? Container(
                            width: 10,
                            height: 10,
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              shape: BoxShape.circle,
                            ),
                          )
                        : Text(
                            '${index + 1}',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Colors.grey.shade500,
                            ),
                          ),
              ),
            ),
            // Connector line
            if (!isLast)
              Container(
                width: 2,
                height: 40,
                color: isCompleted 
                    ? AppColors.primary 
                    : Colors.grey.shade200,
              ),
          ],
        ),
        const SizedBox(width: 16),
        
        // Step content
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                step.title,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: isCompleted || isCurrent
                      ? const Color(0xFF111827)
                      : Colors.grey.shade500,
                ),
              ),
              if (step.description != null) ...[
                const SizedBox(height: 4),
                Text(
                  step.description!,
                  style: TextStyle(
                    fontSize: 13,
                    color: isCompleted || isCurrent
                        ? Colors.grey.shade600
                        : Colors.grey.shade400,
                  ),
                ),
              ],
              if (!isLast) const SizedBox(height: 24),
            ],
          ),
        ),
      ],
    );
  }

  List<TimelineStep> _getSteps() {
    switch (type) {
      case PaymentTimelineType.cash:
        return [
          TimelineStep(
            title: 'Pickup requested',
            description: 'Your request has been sent',
          ),
          TimelineStep(
            title: 'Collector assigned',
            description: 'A collector will be assigned',
          ),
          TimelineStep(
            title: 'Collector arrives',
            description: 'Pay cash when they arrive',
          ),
          TimelineStep(
            title: 'Pay cash',
            description: 'Give cash to collector',
          ),
          TimelineStep(
            title: 'Pickup completed',
            description: 'Collector confirms payment',
          ),
        ];
      case PaymentTimelineType.paymentPending:
        return [
          TimelineStep(
            title: 'Booking created',
            description: 'Your pickup is scheduled',
          ),
          TimelineStep(
            title: 'Payment verification',
            description: 'Waiting for payment confirmation',
          ),
          TimelineStep(
            title: 'Pickup requested',
            description: 'Request sent to collectors',
          ),
          TimelineStep(
            title: 'Collector assigned',
            description: 'A collector accepts your pickup',
          ),
          TimelineStep(
            title: 'Completed',
            description: 'Pickup finished',
          ),
        ];
      case PaymentTimelineType.full:
      default:
        return [
          TimelineStep(
            title: 'Pickup requested',
            description: 'Your request has been sent',
          ),
          TimelineStep(
            title: 'Collector assigned',
            description: 'A collector accepts your pickup',
          ),
          TimelineStep(
            title: 'In progress',
            description: 'Collector is on the way',
          ),
          TimelineStep(
            title: 'Completed',
            description: 'Waste has been collected',
          ),
          TimelineStep(
            title: 'Validated',
            description: 'Payment confirmed',
          ),
        ];
    }
  }
}

/// Types of payment timelines
enum PaymentTimelineType {
  cash,
  paymentPending,
  full,
}

/// Timeline step data
class TimelineStep {
  final String title;
  final String? description;

  TimelineStep({
    required this.title,
    this.description,
  });
}
