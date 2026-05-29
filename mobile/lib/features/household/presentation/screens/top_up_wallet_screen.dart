import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../config/app_theme.dart';
import '../../../../providers/subscription_provider.dart';
import '../../../../providers/user_payment_methods_provider.dart';
import '../../providers/payment_flow_provider.dart';
import '../../../../services/api/wallet_api.dart';

class TopUpWalletScreen extends StatefulWidget {
  const TopUpWalletScreen({super.key});

  @override
  State<TopUpWalletScreen> createState() => _TopUpWalletScreenState();
}

class _TopUpWalletScreenState extends State<TopUpWalletScreen> {
  final TextEditingController _amountController = TextEditingController();
  int _selectedAmount = 0;

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
    return Consumer2<SubscriptionProvider, UserPaymentMethodsProvider>(
      builder: (context, sub, userPaymentProvider, _) {
        final config = sub.appConfig;
        final systemMin = config?.topupMinAmount ?? 500;
        final systemMax = config?.topupMaxAmount ?? 500000;

        // Get provider min/max limits from available cashin providers
        final cashinProviders = config?.cashinProviders ?? [];
        final mins = cashinProviders
            .map((p) => p.minDeposit)
            .whereType<double>()
            .toList();
        final maxs = cashinProviders
            .map((p) => p.maxDeposit)
            .whereType<double>()
            .toList();
        final providerMin = mins.isNotEmpty ? mins.reduce((a, b) => a < b ? a : b) : systemMin;
        final providerMax = maxs.isNotEmpty ? maxs.reduce((a, b) => a > b ? a : b) : systemMax;

        // Use the more restrictive limits
        final effectiveMin = systemMin > providerMin ? systemMin : providerMin;
        final effectiveMax = systemMax < providerMax ? systemMax : providerMax;

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
            const SizedBox(height: 8),
            Text(
              'Min: ${effectiveMin.toStringAsFixed(0)} XAF • Max: ${effectiveMax.toStringAsFixed(0)} XAF',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade500,
              ),
            ),
          ],
        );
      },
    );
  }
  
  Widget _buildQuickAmounts() {
    return Consumer2<SubscriptionProvider, UserPaymentMethodsProvider>(
      builder: (context, sub, userPaymentProvider, _) {
        final config = sub.appConfig;
        final quickAmounts = config?.topupQuickAmounts ?? [1000, 3500, 5000, 10000];
        final systemMin = config?.topupMinAmount ?? 500;
        final systemMax = config?.topupMaxAmount ?? 500000;

        // Get provider min/max limits from available cashin providers
        final cashinProviders = config?.cashinProviders ?? [];
        final mins = cashinProviders
            .map((p) => p.minDeposit)
            .whereType<double>()
            .toList();
        final maxs = cashinProviders
            .map((p) => p.maxDeposit)
            .whereType<double>()
            .toList();
        final providerMin = mins.isNotEmpty ? mins.reduce((a, b) => a < b ? a : b) : systemMin;
        final providerMax = maxs.isNotEmpty ? maxs.reduce((a, b) => a > b ? a : b) : systemMax;

        // Use the more restrictive limits
        final effectiveMin = systemMin > providerMin ? systemMin : providerMin;
        final effectiveMax = systemMax < providerMax ? systemMax : providerMax;

        // Filter quick amounts to be within effective limits
        final filteredAmounts = quickAmounts.where((amount) =>
            amount >= effectiveMin && amount <= effectiveMax).toList();

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
              children: filteredAmounts.map((amount) {
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
      },
    );
  }

  Widget _buildTopUpButton() {
    return Consumer2<SubscriptionProvider, UserPaymentMethodsProvider>(
      builder: (context, sub, userPaymentProvider, _) {
        final config = sub.appConfig;
        final systemMin = config?.topupMinAmount ?? 500;
        final systemMax = config?.topupMaxAmount ?? 500000;
        final topupEnabled = config?.topupEnabled ?? true;

        // Get provider min/max limits from available cashin providers
        final cashinProviders = config?.cashinProviders ?? [];
        final mins = cashinProviders
            .map((p) => p.minDeposit)
            .whereType<double>()
            .toList();
        final maxs = cashinProviders
            .map((p) => p.maxDeposit)
            .whereType<double>()
            .toList();
        final providerMin = mins.isNotEmpty ? mins.reduce((a, b) => a < b ? a : b) : systemMin;
        final providerMax = maxs.isNotEmpty ? maxs.reduce((a, b) => a > b ? a : b) : systemMax;

        // Use the more restrictive limits
        final effectiveMin = systemMin > providerMin ? systemMin : providerMin;
        final effectiveMax = systemMax < providerMax ? systemMax : providerMax;

        final amount = _amountController.text.isNotEmpty
            ? int.tryParse(_amountController.text) ?? 0
            : 0;

        final canSubmit = amount >= effectiveMin && amount <= effectiveMax && topupEnabled;

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
            onPressed: canSubmit ? _navigateToPaymentMethod : null,
            child: Text(
              'Continue',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: canSubmit ? Colors.white : Colors.grey.shade600,
              ),
            ),
          ),
        );
      },
    );
  }

  void _navigateToPaymentMethod() {
    final amount = int.parse(_amountController.text);

    // Set wallet top-up context in PaymentFlowProvider
    context.read<PaymentFlowProvider>().setWalletTopUpContext(amount.toDouble());

    // Navigate to ChoosePaymentMethodScreen with hideCash: true
    Navigator.pushNamed(
      context,
      '/choose-payment-method',
      arguments: {'hideCash': true},
    );
  }
}
