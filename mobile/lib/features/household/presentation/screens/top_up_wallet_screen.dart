import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/app_theme.dart';
import '../../../../providers/subscription_provider.dart';
import '../../../../providers/user_payment_methods_provider.dart';
import '../../../../services/api/wallet_api.dart';

class TopUpWalletScreen extends StatefulWidget {
  const TopUpWalletScreen({super.key});

  @override
  State<TopUpWalletScreen> createState() => _TopUpWalletScreenState();
}

class _TopUpWalletScreenState extends State<TopUpWalletScreen> {
  final TextEditingController _amountController = TextEditingController();
  String? _selectedMethod;
  int _selectedAmount = 0;

  final List<int> _quickAmounts = [1000, 2000, 5000, 10000, 20000, 50000];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final sub = context.read<SubscriptionProvider>();
      if (sub.walletBalance == null) sub.loadWalletBalance();
      if (sub.appConfig == null) sub.loadPricingQuote();
      context.read<UserPaymentMethodsProvider>().loadMethods(usage: 'CASHIN');
    });
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7F4),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Top Up Wallet',
          style: TextStyle(
            color: Colors.black,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Current Balance
            _buildCurrentBalance(),
            
            const SizedBox(height: 32),
            
            // Amount Input
            _buildAmountInput(),
            
            const SizedBox(height: 24),
            
            // Quick Amounts
            _buildQuickAmounts(),
            
            const SizedBox(height: 32),
            
            // Payment Method
            _buildPaymentMethod(),
            
            const SizedBox(height: 32),
            
            // Top Up Button
            _buildTopUpButton(),
          ],
        ),
      ),
    );
  }
  
  Widget _buildCurrentBalance() {
    return Consumer<SubscriptionProvider>(
      builder: (context, sub, _) {
        final balance = sub.walletBalance;
        final balanceText = balance != null
            ? '${balance.toStringAsFixed(0)} XAF'
            : sub.isLoading
                ? '— XAF'
                : '— XAF';

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
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
              Icon(
                Icons.account_balance_wallet,
                color: AppColors.primary,
                size: 24,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Current Balance',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    balance == null && sub.isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(
                            balanceText,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
                            ),
                          ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
  
  Widget _buildAmountInput() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Enter Amount',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 16),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: TextField(
            controller: _amountController,
            keyboardType: TextInputType.number,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
            decoration: InputDecoration(
              prefixText: 'XAF ',
              prefixStyle: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.grey.shade600,
              ),
              hintText: '0',
              hintStyle: TextStyle(
                fontSize: 24,
                color: Colors.grey.shade400,
              ),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.all(20),
            ),
            onChanged: (value) {
              setState(() {
                _selectedAmount = 0;
              });
            },
          ),
        ),
      ],
    );
  }
  
  Widget _buildQuickAmounts() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick Amounts',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.grey.shade700,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: _quickAmounts.map((amount) {
            final isSelected = _selectedAmount == amount;
            return GestureDetector(
              onTap: () {
                setState(() {
                  _selectedAmount = amount;
                  _amountController.text = amount.toString();
                });
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.primary : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected ? AppColors.primary : Colors.grey.shade300,
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: Text(
                  '$amount XAF',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                    color: isSelected ? Colors.white : Colors.black87,
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
  
  Widget _buildPaymentMethod() {
    return Consumer2<SubscriptionProvider, UserPaymentMethodsProvider>(
      builder: (context, sub, paymentMethodsProvider, _) {
        final cashinMethods = paymentMethodsProvider.cashinMethods;

        // Auto-select default method if none selected yet
        if (_selectedMethod == null && cashinMethods.isNotEmpty) {
          _selectedMethod = paymentMethodsProvider.defaultCashinMethod?.id ?? cashinMethods.first.id;
        }

        final config = sub.appConfig;
        final instructions = config?.manualPaymentInstructions ?? '';

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Payment Method',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: Colors.black87,
                  ),
                ),
                TextButton(
                  onPressed: () {
                    Navigator.pushNamed(
                      context,
                      '/payment-methods-setup',
                      arguments: {'mode': 'cashin'},
                    );
                  },
                  child: const Text('Manage methods'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (config != null && !config.paymentIntegrationEnabled && instructions.isNotEmpty) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF8E1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFFA000)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.info_outline_rounded, color: Color(0xFFFFA000), size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        instructions,
                        style: const TextStyle(fontSize: 12, color: Color(0xFF374151), height: 1.5),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
            ],
            if (paymentMethodsProvider.loading)
              const Center(child: CircularProgressIndicator())
            else if (cashinMethods.isEmpty)
              Column(
                children: [
                  Text(
                    'No payment methods saved.',
                    style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: () {
                      Navigator.pushNamed(
                        context,
                        '/payment-methods-setup',
                        arguments: {'mode': 'cashin'},
                      );
                    },
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('Add payment method'),
                  ),
                  if (paymentMethodsProvider.error != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      paymentMethodsProvider.error!,
                      style: const TextStyle(fontSize: 12, color: Colors.red),
                    ),
                  ],
                ],
              )
            else
              ...cashinMethods.asMap().entries.map((entry) {
                final i = entry.key;
                final m = entry.value;
                return Padding(
                  padding: EdgeInsets.only(top: i == 0 ? 0 : 12),
                  child: _buildPaymentMethodOption(
                    id: m.id,
                    title: m.providerName,
                    subtitle: m.maskedAccountNumber,
                    icon: Icons.phone_android,
                    isSelected: _selectedMethod == m.id,
                    onTap: () {
                      setState(() {
                        _selectedMethod = m.id;
                      });
                    },
                  ),
                );
              }),
          ],
        );
      },
    );
  }
  
  Widget _buildPaymentMethodOption({
    required String id,
    required String title,
    required String subtitle,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? AppColors.primary : Colors.grey.shade300,
            width: isSelected ? 2 : 1,
          ),
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
                icon,
                color: AppColors.primary,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check,
                  color: Colors.white,
                  size: 16,
                ),
              ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildTopUpButton() {
    final amount = _amountController.text.isNotEmpty
        ? int.tryParse(_amountController.text) ?? 0
        : 0;
    final canSubmit = amount > 0 && _selectedMethod != null;
    
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: canSubmit ? AppColors.primary : Colors.grey.shade300,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          elevation: 0,
        ),
        onPressed: canSubmit ? _processTopUp : null,
        child: Text(
          'Top Up ${amount > 0 ? '$amount XAF' : ''}',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: canSubmit ? Colors.white : Colors.grey.shade600,
          ),
        ),
      ),
    );
  }
  
  void _processTopUp() {
    final amount = int.parse(_amountController.text);
    
    // Show confirmation dialog
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Text('Confirm Top Up'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Top up $amount XAF to your wallet?',
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 16),
            Text(
              'Payment method: ${_getPaymentMethodName(_selectedMethod)}',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              // Process top up
              _showSuccessDialog(amount);
            },
            child: Text(
              'Confirm',
              style: TextStyle(color: AppColors.primary),
            ),
          ),
        ],
      ),
    );
  }
  
  String _getPaymentMethodName(String? method) {
    if (method == null) return 'Unknown';
    final sub = context.read<SubscriptionProvider>();
    final providers = sub.appConfig?.enabledManualPaymentProviders ?? [];
    final match = providers.where((p) => p.paymentCode == method).toList();
    return match.isNotEmpty ? match.first.providerName : method;
  }
  
  void _showSuccessDialog(int amount) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.check_circle,
                  color: Colors.green.shade700,
                  size: 50,
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'Top Up Successful!',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '$amount XAF has been added to your wallet',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey.shade600,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: () {
                    Navigator.of(context).pop();
                    Navigator.of(context).pop();
                  },
                  child: const Text(
                    'Done',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
