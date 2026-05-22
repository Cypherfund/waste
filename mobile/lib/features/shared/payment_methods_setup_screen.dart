import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../config/app_theme.dart';
import '../../../providers/user_payment_methods_provider.dart';
import '../../../providers/subscription_provider.dart';
import '../../../services/api/wallet_api.dart';

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
      _loadData();
    }
  }

  Future<void> _loadData() async {
    if (_mode == null) return;
    final usage = _mode == PaymentMethodMode.cashin ? 'CASHIN' : 'CASHOUT';
    await context.read<UserPaymentMethodsProvider>().loadMethods(usage: usage);
    if (_mode == PaymentMethodMode.cashin) {
      await context.read<SubscriptionProvider>().loadPricingQuote();
    }
  }

  List<PaymentProvider> _getProviders() {
    final sub = context.read<SubscriptionProvider>();
    final appConfig = sub.appConfig;
    if (appConfig == null) return [];

    if (_mode == PaymentMethodMode.cashin) {
      return appConfig.cashinProviders;
    } else {
      // For cashout, we need to get from payout config
      // For now, return empty - will be loaded via separate call
      return [];
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
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          title,
          style: const TextStyle(
            color: Colors.black,
            fontSize: 18,
            fontWeight: FontWeight.w600,
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
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Error: ${provider.error}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadData,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          // For cashout, we need to show providers from payout config
          // For now, show saved methods grouped by provider
          final groupedMethods = <String, List<UserPaymentMethod>>{};
          for (final method in methods) {
            groupedMethods.putIfAbsent(method.paymentCode, () => []).add(method);
          }

          if (groupedMethods.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.account_balance_wallet_outlined,
                    size: 64,
                    color: Colors.grey.shade400,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No payment methods configured',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.grey.shade600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Add a payment method to get started',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade500,
                    ),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(20),
            itemCount: groupedMethods.length,
            itemBuilder: (context, index) {
              final paymentCode = groupedMethods.keys.elementAt(index);
              final providerMethods = groupedMethods[paymentCode]!;
              final firstMethod = providerMethods.first;

              return _buildMethodCard(firstMethod, providerMethods.length);
            },
          );
        },
      ),
    );
  }

  Widget _buildMethodCard(UserPaymentMethod method, int count) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.primaryLight.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              Icons.phone_android,
              color: AppColors.primary,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      method.providerName,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
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
                          style: TextStyle(
                            fontSize: 10,
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  method.maskedAccountNumber,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey.shade600,
                  ),
                ),
                if (method.accountName != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    method.accountName!,
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade500,
                    ),
                  ),
                ],
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            onPressed: () => _showEditBottomSheet(method),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline),
            color: Colors.red,
            onPressed: () => _showDeleteDialog(method),
          ),
        ],
      ),
    );
  }

  void _showEditBottomSheet(UserPaymentMethod? method) {
    final accountNumberController = TextEditingController(text: method?.accountNumber ?? '');
    final accountNameController = TextEditingController(text: method?.accountName ?? '');
    bool isDefault = method?.isDefault ?? false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setSheetState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          child: Container(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  method == null ? 'Add Payment Method' : 'Edit Payment Method',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 20),
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
                const SizedBox(height: 16),
                SwitchListTile(
                  title: const Text('Set as default'),
                  value: isDefault,
                  onChanged: (value) {
                    setSheetState(() => isDefault = value);
                  },
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Cancel'),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () async {
                          Navigator.pop(context);
                          try {
                            if (method == null) {
                              // Add new method
                              await context.read<UserPaymentMethodsProvider>().addMethod(
                                paymentCode: 'MTN_MOMO', // TODO: allow provider selection
                                accountNumber: accountNumberController.text,
                                accountName: accountNameController.text.isEmpty ? null : accountNameController.text,
                                isDefault: isDefault,
                              );
                            } else {
                              // Update existing
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
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Payment method saved')),
                              );
                            }
                          } catch (e) {
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Error: $e')),
                              );
                            }
                          }
                        },
                        child: const Text('Save'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
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
                    SnackBar(content: Text('Error: $e')),
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
