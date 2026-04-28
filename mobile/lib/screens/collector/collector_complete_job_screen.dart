import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../../config/app_theme.dart';
import '../../models/job.dart';
import '../../providers/collector_jobs_provider.dart';
import '../../widgets/loading_button.dart';

class CollectorCompleteJobScreen extends StatefulWidget {
  final Job job;

  const CollectorCompleteJobScreen({super.key, required this.job});

  @override
  State<CollectorCompleteJobScreen> createState() =>
      _CollectorCompleteJobScreenState();
}

class _CollectorCompleteJobScreenState
    extends State<CollectorCompleteJobScreen> {
  File? _proofImage;

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CollectorJobsProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text('Complete Job', style: AppTypography.heading3),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title
            Text(
              'Take a photo as proof',
              style: AppTypography.heading3,
            ),
            const SizedBox(height: 4),
            Text(
              'Make sure the waste has been collected.',
              style: AppTypography.body.copyWith(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 24),

            // Photo area
            Expanded(
              child: _proofImage == null
                  ? _buildPhotoPlaceholder()
                  : _buildPhotoPreview(),
            ),
            const SizedBox(height: 20),

            // Action buttons
            if (_proofImage == null)
              LoadingButton(
                label: 'Use Photo',
                icon: Icons.camera_alt,
                onPressed: _pickProofImage,
              )
            else ...[
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => setState(() => _proofImage = null),
                      icon: const Icon(Icons.refresh, size: 18),
                      label: const Text('Retake'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.textSecondary,
                        side: const BorderSide(color: AppColors.border),
                        minimumSize: const Size(0, 48),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _pickProofImage,
                      icon: const Icon(Icons.camera_alt, size: 18),
                      label: const Text('Use Photo'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        minimumSize: const Size(0, 48),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              LoadingButton(
                label: 'Submit Proof',
                icon: Icons.check,
                isLoading: provider.isActioning,
                onPressed: () => _handleSubmitProof(provider),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPhotoPlaceholder() {
    return GestureDetector(
      onTap: _pickProofImage,
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: AppColors.inputFill,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border, width: 1.5),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppColors.primarySurface,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.camera_alt_outlined,
                  size: 36, color: AppColors.primary),
            ),
            const SizedBox(height: 16),
            Text(
              'Tap to take a photo',
              style: AppTypography.subtitle.copyWith(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 6),
            Text(
              'Photo of collected waste as proof',
              style: AppTypography.caption,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPhotoPreview() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Image.file(
        _proofImage!,
        width: double.infinity,
        fit: BoxFit.cover,
      ),
    );
  }

  Future<void> _pickProofImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.camera,
      maxWidth: 1280,
      maxHeight: 1280,
      imageQuality: 80,
    );
    if (picked != null) {
      setState(() => _proofImage = File(picked.path));
    }
  }

  Future<void> _handleSubmitProof(CollectorJobsProvider provider) async {
    if (_proofImage == null) return;

    final success = await provider.completeJob(
      widget.job.id,
      proofImage: _proofImage!,
    );

    if (success && mounted) {
      Navigator.pushReplacementNamed(
        context,
        '/collector-job-completed',
        arguments: widget.job,
      );
    }
  }
}
