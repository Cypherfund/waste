import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../config/app_theme.dart';
import '../../../../providers/job_provider.dart';
import '../../../../providers/subscription_provider.dart';
import '../../../../models/subscription.dart';
import '../../../../providers/user_payment_methods_provider.dart';
import '../../../../services/api/files_api.dart';
import '../../providers/payment_flow_provider.dart';
import '../../providers/payment_flow_enums.dart';

/// Screen 3: Manual Payment Screen
/// 
/// Shows payment instructions, reference input, and optional/required screenshot upload
class ManualPaymentScreen extends StatefulWidget {
  const ManualPaymentScreen({super.key});

  @override
  State<ManualPaymentScreen> createState() => _ManualPaymentScreenState();
}

class _ManualPaymentScreenState extends State<ManualPaymentScreen> {
  final _paymentRefController = TextEditingController();
  XFile? _paymentProofImage;
  bool _isUploadingProof = false;
  String? _uploadedProofUrl;
  bool _isCreatingJob = false;

  @override
  void dispose() {
    _paymentRefController.dispose();
    super.dispose();
  }

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
          'Manual Payment',
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
              child: Consumer3<
                PaymentFlowProvider,
                SubscriptionProvider,
                UserPaymentMethodsProvider
              >(
                builder: (context, flowProvider, subProvider, userPaymentProvider, _) {
                  final selectedMethod = userPaymentProvider.cashinMethods
                      .where((m) => m.id == flowProvider.selectedProviderId)
                      .firstOrNull;

                  if (selectedMethod == null) {
                    return const Center(
                      child: Text('Payment method not found'),
                    );
                  }

                  // Check if screenshot is required
                  final requiresScreenshot = selectedMethod.supportsCashin;

                  return SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Amount card
                        _buildAmountCard(flowProvider.amountDue, selectedMethod.providerName),
                        const SizedBox(height: 24),

                        // Payment instructions
                        _buildInstructionsCard(selectedMethod),
                        const SizedBox(height: 24),

                        // Reference input
                        _buildReferenceInput(),
                        const SizedBox(height: 20),

                        // Screenshot upload (optional or required based on config)
                        _buildScreenshotUpload(requiresScreenshot),
                        const SizedBox(height: 24),

                        // Warning banner
                        _buildWarningBanner(flowProvider.isSubscriptionContext),
                        const SizedBox(height: 24),

                        // WhatsApp support (if available)
                        if (subProvider.appConfig?.supportWhatsapp?.isNotEmpty == true)
                          _buildWhatsAppSupport(subProvider.appConfig!.supportWhatsapp!),
                      ],
                    ),
                  );
                },
              ),
            ),
            _buildSubmitButton(),
          ],
        ),
      ),
    );
  }

  Widget _buildAmountCard(double amount, String providerName) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        children: [
          Text(
            'Pay ${amount.toStringAsFixed(0)} XAF',
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: Color(0xFF111827),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'using $providerName',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInstructionsCard(dynamic selectedMethod) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF8E1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFFA000)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.info_outline, color: Colors.orange.shade800),
              const SizedBox(width: 8),
              Text(
                'Payment Instructions',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Colors.orange.shade800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildInstructionStep(
            '1',
            'Send money to:',
            selectedMethod.accountNumber ?? 'Contact support',
            isHighlight: true,
          ),
          const SizedBox(height: 12),
          _buildInstructionStep(
            '2',
            'Account name:',
            selectedMethod.accountName ?? 'KmerTrash',
          ),
          const SizedBox(height: 12),
          _buildInstructionStep(
            '3',
            'Enter the transaction reference below',
            '',
          ),
        ],
      ),
    );
  }

  Widget _buildInstructionStep(String number, String label, String value, {bool isHighlight = false}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            color: const Color(0xFFFFA000),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: Text(
              number,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey.shade700,
                ),
              ),
              if (value.isNotEmpty)
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: isHighlight ? FontWeight.w700 : FontWeight.w500,
                    color: const Color(0xFF111827),
                  ),
                ),
            ],
          ),
        ),
        // Copy button for phone/account number
        if (value.isNotEmpty && isHighlight)
          IconButton(
            icon: const Icon(Icons.copy, size: 18),
            onPressed: () {
              Clipboard.setData(ClipboardData(text: value));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Copied to clipboard')),
              );
            },
          ),
      ],
    );
  }

  Widget _buildReferenceInput() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Transaction Reference',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: Colors.grey.shade800,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _paymentRefController,
          enabled: !_isCreatingJob,
          textCapitalization: TextCapitalization.characters,
          decoration: InputDecoration(
            hintText: 'e.g. TXN12345678',
            hintStyle: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade400,
            ),
            filled: true,
            fillColor: const Color(0xFFF9FAFB),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: AppColors.primary, width: 2),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Enter your transaction ID so the admin can verify quickly',
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey.shade600,
          ),
        ),
      ],
    );
  }

  Widget _buildScreenshotUpload(bool isRequired) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'Payment Screenshot',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: Colors.grey.shade800,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: isRequired ? const Color(0xFFFFEBEE) : const Color(0xFFE8F5E9),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                isRequired ? 'Required' : 'Recommended',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: isRequired ? const Color(0xFFC62828) : const Color(0xFF2E7D32),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: _isUploadingProof || _isCreatingJob ? null : _pickPaymentProof,
          child: Container(
            width: double.infinity,
            height: 120,
            decoration: BoxDecoration(
              color: _paymentProofImage != null ? Colors.transparent : const Color(0xFFF9FAFB),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: _uploadedProofUrl != null
                    ? AppColors.primary
                    : isRequired && _paymentProofImage == null
                        ? const Color(0xFFC62828)
                        : Colors.grey.shade300,
                width: _uploadedProofUrl != null ? 2 : 1,
              ),
            ),
            child: _isUploadingProof
                ? const Center(child: CircularProgressIndicator())
                : _paymentProofImage != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(9),
                        child: FutureBuilder<Uint8List>(
                          future: _paymentProofImage!.readAsBytes(),
                          builder: (ctx, snap) => snap.hasData
                              ? Image.memory(snap.data!, fit: BoxFit.cover)
                              : const Center(child: CircularProgressIndicator()),
                        ),
                      )
                    : Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.upload_file_outlined,
                            size: 32,
                            color: Colors.grey.shade500,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Tap to upload screenshot',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey.shade600,
                            ),
                          ),
                          if (isRequired) ...[
                            const SizedBox(height: 4),
                            Text(
                              'Screenshot is required for verification',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade500,
                              ),
                            ),
                          ],
                        ],
                      ),
          ),
        ),
      ],
    );
  }

  Widget _buildWarningBanner(bool isSubscription) {
    final message = isSubscription
        ? 'Your subscription will become active after admin verifies your payment. This may take a few minutes.'
        : 'Your pickup will start after admin verifies your payment. This may take a few minutes.';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF3E0),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(Icons.schedule, color: Colors.orange.shade800),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                fontSize: 13,
                color: Colors.orange.shade800,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWhatsAppSupport(String whatsapp) {
    return GestureDetector(
      onTap: () => _openWhatsApp(whatsapp),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFE8F5E9),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(Icons.chat, color: AppColors.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Need help? Chat with us on WhatsApp',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Tap for payment issues or questions',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.arrow_forward_ios, size: 16, color: AppColors.primary),
          ],
        ),
      ),
    );
  }

  Widget _buildSubmitButton() {
    return Container(
      width: double.infinity,
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      child: SafeArea(
        top: false,
        child: ElevatedButton(
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
          onPressed: _isCreatingJob ? null : _submitPayment,
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
                  'Submit Payment for Verification',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
        ),
      ),
    );
  }

  Future<void> _pickPaymentProof() async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1280,
        maxHeight: 1280,
        imageQuality: 80,
      );
      if (picked == null || !mounted) return;

      setState(() {
        _paymentProofImage = picked;
        _isUploadingProof = true;
        _uploadedProofUrl = null;
      });

      final filesApi = context.read<FilesApi>();
      final result = await filesApi.uploadProofImage(picked);

      if (mounted) {
        setState(() {
          _uploadedProofUrl = result.fileUrl;
          _isUploadingProof = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isUploadingProof = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload failed: $e')),
        );
      }
    }
  }

  Future<void> _submitPayment() async {
    final flowProvider = context.read<PaymentFlowProvider>();
    final userPaymentProvider = context.read<UserPaymentMethodsProvider>();

    // Get selected method to check if screenshot is required
    final selectedMethod = userPaymentProvider.cashinMethods
        .where((m) => m.id == flowProvider.selectedProviderId)
        .firstOrNull;

    if (selectedMethod == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Payment method not found')),
      );
      return;
    }

    final requiresScreenshot = selectedMethod.supportsCashin;
    final paymentRef = _paymentRefController.text.trim();

    // Validate reference
    if (paymentRef.length < 4) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid transaction reference (min 4 characters)')),
      );
      return;
    }

    // Validate screenshot if required
    if (requiresScreenshot && _uploadedProofUrl == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please upload a payment screenshot')),
      );
      return;
    }

    // Wait for upload if in progress
    if (_isUploadingProof) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please wait for upload to complete')),
      );
      return;
    }

    setState(() => _isCreatingJob = true);

    try {
      // ── Subscription payment branch ──────────────────────────────
      if (flowProvider.isSubscriptionContext) {
        final subProvider = context.read<SubscriptionProvider>();
        final subscription = await subProvider.subscribeWithPayment(
          planId: flowProvider.subscriptionPlanId!,
          paymentMode: 'MANUAL_PROVIDER',
          paymentRef: paymentRef,
          paymentProofUrl: _uploadedProofUrl,
        );

        if (subscription != null && mounted) {
          flowProvider.setManualPaymentDetails(
            paymentRef: paymentRef,
            paymentProofUrl: _uploadedProofUrl,
          );
          flowProvider.setResultType(PaymentResultType.submitted);

          Navigator.pushNamedAndRemoveUntil(
            context,
            '/payment-result',
            (route) => route.settings.name == '/home',
            arguments: {
              'resultType': PaymentResultType.submitted,
              'isSubscription': true,
              'subscription': subscription,
            },
          );
        }
        return;
      }

      // ── Job payment branch (existing) ────────────────────────────
      final jobProvider = context.read<JobProvider>();

      final job = await jobProvider.createJob(
        scheduledDate: flowProvider.scheduledDate!,
        scheduledTime: flowProvider.scheduledTime!,
        locationAddress: flowProvider.fullAddress,
        locationLat: flowProvider.locationLat,
        locationLng: flowProvider.locationLng,
        notes: 'Manual payment: ${flowProvider.selectedProviderName}',
        paymentMode: 'MANUAL_PROVIDER',
        paymentMethod: flowProvider.selectedPaymentMethodCode,
        paymentRef: paymentRef,
        paymentProofUrl: _uploadedProofUrl,
      );

      if (job != null && mounted) {
        flowProvider.setCreatedJob(job);
        flowProvider.setManualPaymentDetails(
          paymentRef: paymentRef,
          paymentProofUrl: _uploadedProofUrl,
        );
        flowProvider.setResultType(PaymentResultType.submitted);

        Navigator.pushNamedAndRemoveUntil(
          context,
          '/payment-result',
          (route) => route.settings.name == '/home',
          arguments: {
            'resultType': PaymentResultType.submitted,
            'job': job,
          },
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to submit: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isCreatingJob = false);
      }
    }
  }

  Future<void> _openWhatsApp(String phone) async {
    final clean = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    final url = Uri.parse('https://wa.me/$clean');
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open WhatsApp')),
        );
      }
    }
  }
}
