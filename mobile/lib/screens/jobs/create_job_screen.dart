import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../config/app_theme.dart';
import '../../providers/jobs_provider.dart';
import '../../widgets/app_card.dart';
import '../../widgets/app_text_field.dart';
import '../../widgets/error_banner.dart';
import '../../widgets/bottom_cta.dart';

class CreateJobScreen extends StatefulWidget {
  const CreateJobScreen({super.key});

  @override
  State<CreateJobScreen> createState() => _CreateJobScreenState();
}

class _CreateJobScreenState extends State<CreateJobScreen> {
  final _formKey = GlobalKey<FormState>();
  final _addressController = TextEditingController();
  final _notesController = TextEditingController();

  DateTime _scheduledDate = DateTime.now().add(const Duration(days: 1));
  TimeOfDay _startTime = const TimeOfDay(hour: 8, minute: 0);
  TimeOfDay _endTime = const TimeOfDay(hour: 10, minute: 0);

  @override
  void dispose() {
    _addressController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  String get _formattedDate => DateFormat('yyyy-MM-dd').format(_scheduledDate);

  String get _formattedTimeWindow {
    String fmt(TimeOfDay t) =>
        '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
    return '${fmt(_startTime)}-${fmt(_endTime)}';
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _scheduledDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: Theme.of(context).colorScheme.copyWith(
                  primary: AppColors.primary,
                ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _scheduledDate = picked);
    }
  }

  Future<void> _pickStartTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _startTime,
    );
    if (picked != null) {
      setState(() => _startTime = picked);
    }
  }

  Future<void> _pickEndTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _endTime,
    );
    if (picked != null) {
      setState(() => _endTime = picked);
    }
  }

  Future<void> _handleCreate() async {
    if (!_formKey.currentState!.validate()) return;

    final provider = context.read<JobsProvider>();
    final job = await provider.createJob(
      scheduledDate: _formattedDate,
      scheduledTime: _formattedTimeWindow,
      locationAddress: _addressController.text.trim(),
      notes: _notesController.text.trim(),
    );

    if (job != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Job created successfully!'),
          backgroundColor: AppColors.success,
        ),
      );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<JobsProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text('Schedule Collection', style: AppTypography.heading3),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (provider.error != null)
                ErrorBanner(
                  message: provider.error!,
                  onDismiss: provider.clearError,
                ),

              // Date picker
              Text('Select a date', style: AppTypography.subtitle),
              const SizedBox(height: AppSpacing.sm),
              AppCard(
                onTap: _pickDate,
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppColors.primarySurface,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.calendar_today, size: 20, color: AppColors.primary),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      DateFormat('EEEE, MMMM d, yyyy').format(_scheduledDate),
                      style: AppTypography.body,
                    ),
                    const Spacer(),
                    const Icon(Icons.chevron_right, color: AppColors.textHint),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),

              // Time window
              Text('Select a time slot', style: AppTypography.subtitle),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  Expanded(
                    child: AppCard(
                      onTap: _pickStartTime,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.access_time, size: 18, color: AppColors.primary),
                          const SizedBox(width: 8),
                          Text(_startTime.format(context), style: AppTypography.bodyMedium),
                        ],
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Text('to', style: AppTypography.body.copyWith(color: AppColors.textSecondary)),
                  ),
                  Expanded(
                    child: AppCard(
                      onTap: _pickEndTime,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.access_time, size: 18, color: AppColors.primary),
                          const SizedBox(width: 8),
                          Text(_endTime.format(context), style: AppTypography.bodyMedium),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),

              // Address
              Text('Pickup Address', style: AppTypography.subtitle),
              const SizedBox(height: AppSpacing.sm),
              AppTextField(
                controller: _addressController,
                label: 'Address',
                hint: 'Rue de la Joie, Akwa, Douala',
                maxLines: 2,
                prefixIcon: const Icon(Icons.location_on_outlined, color: AppColors.textHint, size: 22),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Address is required';
                  }
                  if (value.trim().length < 5) {
                    return 'Address must be at least 5 characters';
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppSpacing.md),

              // Notes
              Text('Additional Instructions', style: AppTypography.subtitle),
              const SizedBox(height: AppSpacing.sm),
              AppTextField(
                controller: _notesController,
                label: 'Notes (optional)',
                hint: 'Gate is blue, ring the bell',
                maxLines: 3,
                prefixIcon: const Icon(Icons.notes_outlined, color: AppColors.textHint, size: 22),
              ),
            ],
          ),
        ),
      ),
      bottomSheet: BottomCTA(
        label: 'Schedule Collection',
        isLoading: provider.isLoading,
        onPressed: _handleCreate,
        icon: Icons.check,
      ),
    );
  }
}
