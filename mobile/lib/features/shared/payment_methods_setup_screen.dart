import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import '../../../config/app_theme.dart';
import '../../../providers/user_payment_methods_provider.dart';
import '../../../providers/subscription_provider.dart';
import '../../../providers/collector_earnings_provider.dart';
import '../../../services/api/wallet_api.dart';
import '../../../widgets/skeleton_loader.dart';

enum PaymentMethodMode { cashin, cashout }

class PaymentMethodsSetupScreen extends StatefulWidget {
  const PaymentMethodsSetupScreen({super.key});

  @override
  State<PaymentMethodsSetupScreen> createState() => _PaymentMethodsSetupScreenState();
}

class _PaymentMethodsSetupScreenState extends State<PaymentMethodsSetupScreen> {
  PaymentMethodMode? _mode;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args = ModalRoute.of(context)?.settings.arguments as Map?;
    if (args != null && _mode == null) {
      _mode = args['mode'] == 'cashin' ? PaymentMethodMode.cashin : PaymentMethodMode.cashout;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _loadData();
      });
    }
  }

  Future<void> _loadData() async {
    if (_mode == null) return;
    final usage = _mode == PaymentMethodMode.cashin ? 'CASHIN' : 'CASHOUT';
    await context.read<UserPaymentMethodsProvider>().loadMethods(usage: usage);
    if (_mode == PaymentMethodMode.cashin) {
      await context.read<SubscriptionProvider>().loadPricingQuote();
    } else {
      await context.read<CollectorEarningsProvider>().loadWallet();
    }
  }

  List<PaymentProvider> _getProviders() {
    if (_mode == PaymentMethodMode.cashin) {
      final sub = context.read<SubscriptionProvider>();
      final appConfig = sub.appConfig;
      if (appConfig == null) return [];
      return appConfig.cashinProviders;
    } else {
      final earningsProvider = context.read<CollectorEarningsProvider>();
      final payoutConfig = earningsProvider.payoutConfig;
      if (payoutConfig == null) return [];
      return payoutConfig.cashoutProviders;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_mode == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final title = _mode == PaymentMethodMode.cashin ? 'Payment Methods' : 'Payout Methods';

    return Scaffold(
      backgroundColor: const Color(0xFFF4F7F4),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black, size: 16),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          title,
          style: const TextStyle(
            color: Colors.black,
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
        centerTitle: true,
      ),
      body: Consumer<UserPaymentMethodsProvider>(
        builder: (context, provider, _) {
          final methods = _mode == PaymentMethodMode.cashin
              ? provider.cashinMethods
              : provider.cashoutMethods;

          if (provider.loading) {
            return ListView(
              padding: const EdgeInsets.all(20),
              children: [
                // Section label skeleton
                SkeletonLoader(width: 140, height: 16, borderRadius: BorderRadius.circular(4)),
                const SizedBox(height: 12),
                // Payment method card skeletons
                ...List.generate(3, (_) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: SkeletonLoader(
                    width: double.infinity,
                    height: 72,
                    borderRadius: BorderRadius.circular(14),
                  ),
                )),
                // Add new section skeleton
                const SizedBox(height: 24),
                SkeletonLoader(width: 140, height: 16, borderRadius: BorderRadius.circular(4)),
                const SizedBox(height: 12),
                // Provider card skeletons
                ...List.generate(2, (_) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: SkeletonLoader(
                    width: double.infinity,
                    height: 64,
                    borderRadius: BorderRadius.circular(12),
                  ),
                )),
              ],
            );
          }

          if (provider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(provider.error!),
                  const SizedBox(height: 16),
                  ElevatedButton(onPressed: _loadData, child: const Text('Retry')),
                ],
              ),
            );
          }

          final allProviders = _getProviders();
          final groupedMethods = <String, List<UserPaymentMethod>>{};
          for (final method in methods) {
            groupedMethods.putIfAbsent(method.paymentCode.toLowerCase(), () => []).add(method);
          }

          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              // ── Saved methods ──────────────────────────────────────
              if (groupedMethods.isNotEmpty) ...[
                Text(
                  'Saved Methods',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: Colors.grey.shade600,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 12),
                ...groupedMethods.entries.map((entry) {
                  final providerObj = allProviders
                      .where((p) => p.paymentCode.toLowerCase() == entry.key)
                      .firstOrNull;
                  return _buildMethodCard(entry.value.first, providerObj);
                }),
                const SizedBox(height: 24),
              ],

              // ── Available providers to add ─────────────────────────
              if (allProviders.isNotEmpty) ...[
                Text(
                  'Add a Payment Method',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: Colors.grey.shade600,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 12),
                ...allProviders.map((p) => _buildProviderTile(p)),
              ],

              if (allProviders.isEmpty && groupedMethods.isEmpty)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 80),
                    child: Column(
                      children: [
                        Icon(Icons.account_balance_wallet_outlined, size: 64, color: Colors.grey.shade400),
                        const SizedBox(height: 16),
                        Text(
                          'No payment providers available',
                          style: TextStyle(fontSize: 15, color: Colors.grey.shade600),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildProviderTile(PaymentProvider provider) {
    return GestureDetector(
      onTap: () => _showEditBottomSheet(null, preselectedCode: provider.paymentCode),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Row(
          children: [
            _buildProviderLogo(provider.imageUrl, size: 40),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                provider.providerName,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.black87),
              ),
            ),
            Icon(Icons.add_circle_outline_rounded, color: AppColors.primary, size: 22),
          ],
        ),
      ),
    );
  }

  Widget _buildMethodCard(UserPaymentMethod method, PaymentProvider? provider) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 3)),
        ],
      ),
      child: Row(
        children: [
          _buildProviderLogo(provider?.imageUrl, size: 44),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        method.providerName,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.black87),
                      ),
                    ),
                    if (method.isDefault) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'Default',
                          style: TextStyle(fontSize: 10, color: AppColors.primary, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 3),
                Text(method.maskedAccountNumber, style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                if (method.accountName != null)
                  Text(method.accountName!, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.edit_outlined, size: 20),
            onPressed: () => _showEditBottomSheet(method),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline, size: 20),
            color: Colors.red,
            onPressed: () => _showDeleteDialog(method),
          ),
        ],
      ),
    );
  }

  Widget _buildProviderLogo(String? imageUrl, {double size = 40}) {
    if (imageUrl != null && imageUrl.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: CachedNetworkImage(
          imageUrl: imageUrl,
          width: size,
          height: size,
          fit: BoxFit.contain,
          placeholder: (_, __) => _logoPlaceholder(size),
          errorWidget: (_, __, ___) => _logoPlaceholder(size),
        ),
      );
    }
    return _logoPlaceholder(size);
  }

  Widget _logoPlaceholder(double size) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.primaryLight.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(Icons.phone_android, color: AppColors.primary, size: size * 0.55),
    );
  }

  void _showEditBottomSheet(UserPaymentMethod? method, {String? preselectedCode}) {
    final accountNumberController = TextEditingController(text: method?.accountNumber ?? '');
    final accountNameController = TextEditingController(text: method?.accountName ?? '');
    bool isDefault = method?.isDefault ?? false;
    String? selectedPaymentCode = method?.paymentCode ?? preselectedCode;
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheetContext) => StatefulBuilder(
        builder: (sheetContext, setSheetState) {
          final providers = _getProviders();
          return Padding(
            padding: EdgeInsets.only(bottom: MediaQuery.of(sheetContext).viewInsets.bottom),
            child: Container(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Handle bar
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  Text(
                    method == null ? 'Add Payment Method' : 'Edit Payment Method',
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 20),

                  // Provider selector (only when adding new and not preselected)
                  if (method == null && preselectedCode == null && providers.isNotEmpty) ...[
                    DropdownButtonFormField<String>(
                      value: selectedPaymentCode,
                      decoration: const InputDecoration(labelText: 'Payment Provider', border: OutlineInputBorder()),
                      items: providers.map((p) => DropdownMenuItem(value: p.paymentCode, child: Text(p.providerName))).toList(),
                      onChanged: (value) => setSheetState(() => selectedPaymentCode = value),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Show selected provider name when preselected
                  if (preselectedCode != null && method == null) ...[
                    Row(
                      children: [
                        _buildProviderLogo(
                          providers.where((p) => p.paymentCode == preselectedCode).firstOrNull?.imageUrl,
                          size: 32,
                        ),
                        const SizedBox(width: 10),
                        Text(
                          providers.where((p) => p.paymentCode == preselectedCode).firstOrNull?.providerName ?? preselectedCode,
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                  ],

                  TextField(
                    controller: accountNumberController,
                    decoration: const InputDecoration(
                      labelText: 'Account Number',
                      hintText: '+237 6XX XXX XXX',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.phone,
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: accountNameController,
                    decoration: const InputDecoration(
                      labelText: 'Account Name (optional)',
                      hintText: 'John Doe',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Set as default'),
                    value: isDefault,
                    onChanged: (value) => setSheetState(() => isDefault = value),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: isSaving ? null : () => Navigator.pop(sheetContext),
                          child: const Text('Cancel'),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                          ),
                          onPressed: isSaving
                              ? null
                              : () async {
                                  if (method == null && selectedPaymentCode == null) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Please select a payment provider')),
                                    );
                                    return;
                                  }
                                  setSheetState(() => isSaving = true);
                                  try {
                                    if (method == null) {
                                      await context.read<UserPaymentMethodsProvider>().addMethod(
                                        paymentCode: selectedPaymentCode!,
                                        accountNumber: accountNumberController.text,
                                        accountName: accountNameController.text.isEmpty ? null : accountNameController.text,
                                        isDefault: isDefault,
                                      );
                                    } else {
                                      await context.read<UserPaymentMethodsProvider>().updateMethod(
                                        method.id,
                                        accountNumber: accountNumberController.text.isEmpty ? null : accountNumberController.text,
                                        accountName: accountNameController.text.isEmpty ? null : accountNameController.text,
                                      );
                                      if (isDefault) {
                                        await context.read<UserPaymentMethodsProvider>().setDefault(
                                          method.id,
                                          _mode == PaymentMethodMode.cashin ? 'CASHIN' : 'CASHOUT',
                                        );
                                      }
                                    }
                                    if (mounted) Navigator.pop(sheetContext);
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Payment method saved')),
                                      );
                                    }
                                  } catch (e) {
                                    setSheetState(() => isSaving = false);
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Failed to save. Please try again.')),
                                      );
                                    }
                                  }
                                },
                          child: isSaving
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Text('Save'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  void _showDeleteDialog(UserPaymentMethod method) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Payment Method'),
        content: Text('Are you sure you want to delete ${method.providerName} (${method.maskedAccountNumber})?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              try {
                await context.read<UserPaymentMethodsProvider>().deleteMethod(method.id);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Payment method deleted')),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Failed to delete. Please try again.')),
                  );
                }
              }
            },
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}
