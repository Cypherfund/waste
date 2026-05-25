import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../config/app_theme.dart';
import '../../../providers/user_payment_methods_provider.dart';
import '../../../providers/subscription_provider.dart';
import '../../../providers/collector_earnings_provider.dart';
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
      // Load payout config for cashout providers
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
      // For cashout, get from payout config cashoutProviders (from payment_provider table)
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
        actions: [
          IconButton(
            icon: const Icon(Icons.add, color: Colors.black),
            tooltip: 'Add method',
            onPressed: () => _showEditBottomSheet(null),
          ),
        ],
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
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () => _showEditBottomSheet(null),
                    icon: const Icon(Icons.add),
                    label: const Text('Add Payment Method'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
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
                    Flexible(
                      child: Text(
                        method.providerName,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.black87,
                        ),
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
    String? selectedPaymentCode = method?.paymentCode;
    // providers are read inside the builder so they update if appConfig loads while sheet is open

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setSheetState) {
          final providers = _getProviders();
          return Padding(
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
                if (method == null) ...[
                  if (providers.isEmpty)
                    Consumer<SubscriptionProvider>(
                      builder: (context, sub, _) {
                        if (sub.isPricingLoading) {
                          return const Padding(
                            padding: EdgeInsets.only(bottom: 16),
                            child: Row(
                              children: [
                                SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                ),
                                SizedBox(width: 10),
                                Text('Loading payment providers...'),
                              ],
                            ),
                          );
                        }
                        return const Padding(
                          padding: EdgeInsets.only(bottom: 16),
                          child: Text(
                            'No payment providers available. Please try again later.',
                            style: TextStyle(color: Colors.red, fontSize: 13),
                          ),
                        );
                      },
                    )
                  else ...[
                    DropdownButtonFormField<String>(
                      value: selectedPaymentCode,
                      decoration: const InputDecoration(
                        labelText: 'Payment Provider',
                        border: OutlineInputBorder(),
                      ),
                      items: providers.map((provider) {
                        return DropdownMenuItem<String>(
                          value: provider.paymentCode,
                          child: Text(provider.providerName),
                        );
                      }).toList(),
                      onChanged: (value) {
                        setSheetState(() => selectedPaymentCode = value);
                      },
                    ),
                    const SizedBox(height: 16),
                  ],
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
                          if (method == null && selectedPaymentCode == null) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Please select a payment provider')),
                            );
                            return;
                          }
                          final scaffoldMessenger = ScaffoldMessenger.of(context);
                          Navigator.pop(context);
                          try {
                            if (method == null) {
                              // Add new method
                              await context.read<UserPaymentMethodsProvider>().addMethod(
                                paymentCode: selectedPaymentCode!,
                                accountNumber: accountNumberController.text,
                                accountName: accountNumberController.text.isEmpty ? null : accountNameController.text,
                                isDefault: isDefault,
                              );
                            } else {
                              // Update existing
                              await context.read<UserPaymentMethodsProvider>().updateMethod(
                                method.id,
                                accountNumber: accountNumberController.text.isEmpty ? null : accountNumberController.text,
                                accountName: accountNumberController.text.isEmpty ? null : accountNumberController.text,
                              );
                              if (isDefault) {
                                await context.read<UserPaymentMethodsProvider>().setDefault(
                                  method.id,
                                  _mode == PaymentMethodMode.cashin ? 'CASHIN' : 'CASHOUT',
                                );
                              }
                            }
                            if (mounted) {
                              scaffoldMessenger.showSnackBar(
                                const SnackBar(content: Text('Payment method saved')),
                              );
                            }
                          } catch (e) {
                            if (mounted) {
                              scaffoldMessenger.showSnackBar(
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
