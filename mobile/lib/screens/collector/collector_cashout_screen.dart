import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/collector_earnings_provider.dart';
import '../../providers/user_payment_methods_provider.dart';
import '../../services/api/wallet_api.dart';
import '../../widgets/app_card.dart';
import '../../widgets/loading_button.dart';
import '../../widgets/skeleton_loader.dart';

class CollectorCashoutScreen extends StatefulWidget {
  const CollectorCashoutScreen({super.key});

  @override
  State<CollectorCashoutScreen> createState() => _CollectorCashoutScreenState();
}

class _CollectorCashoutScreenState extends State<CollectorCashoutScreen>
    with SingleTickerProviderStateMixin {
  final _amountController = TextEditingController();
  UserPaymentMethod? _selectedPaymentMethod;
  late TabController _tabController;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_tabInitialized) {
      _tabInitialized = true;
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args is Map && args['tab'] == 1) {
        _tabController.index = 1;
      }
    }
  }

  bool _tabInitialized = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CollectorEarningsProvider>().loadWallet();
      context.read<UserPaymentMethodsProvider>().loadMethods(usage: 'CASHOUT');
    });
  }

  @override
  void dispose() {
    _amountController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CollectorEarningsProvider>();
    final paymentMethodsProvider = context.watch<UserPaymentMethodsProvider>();
    final config = provider.payoutConfig;
    final balance = provider.walletBalance;
    final cashoutMethods = paymentMethodsProvider.cashoutMethods;

    // Auto-select default method if none selected
    if (_selectedPaymentMethod == null && cashoutMethods.isNotEmpty) {
      _selectedPaymentMethod = paymentMethodsProvider.defaultCashoutMethod ?? cashoutMethods.first;
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Text('Wallet', style: AppTypography.heading3),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [Tab(text: 'Withdraw'), Tab(text: 'History')],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildWithdrawTab(context, provider, config, balance, cashoutMethods),
          _buildHistoryTab(provider),
        ],
      ),
    );
  }

  Widget _buildWithdrawTab(
    BuildContext context,
    CollectorEarningsProvider provider,
    PayoutConfig? config,
    double balance,
    List<UserPaymentMethod> cashoutMethods,
  ) {
    final min = config?.minWithdrawal ?? 1000;
    final max = config?.maxWithdrawal ?? 500000;

    // Empty state: no payment methods configured
    if (cashoutMethods.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
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
                'No payout method configured',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey.shade700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Add a payment method to withdraw your earnings.',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey.shade500,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.pushNamed(
                    context,
                    '/payment-methods-setup',
                    arguments: {'mode': 'cashout'},
                  );
                },
                icon: const Icon(Icons.add),
                label: const Text('Add Payout Method'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        // Balance card
        AppCard(
          color: AppColors.primary,
          shadow: AppShadows.elevated,
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Wallet Balance',
                  style: AppTypography.caption.copyWith(color: Colors.white70)),
              const SizedBox(height: 6),
              provider.isLoading && balance == 0
                  ? SkeletonLoader(
                      width: 160,
                      height: 36,
                      borderRadius: BorderRadius.circular(6),
                      baseColor: Colors.white24,
                      highlightColor: Colors.white38,
                    )
                  : Text(
                      '${balance.toStringAsFixed(0)} XAF',
                      style: AppTypography.heading1
                          .copyWith(color: Colors.white, fontSize: 32),
                    ),
              const SizedBox(height: 4),
              Text(
                'Min: ${min.toStringAsFixed(0)} XAF  ·  Max: ${max.toStringAsFixed(0)} XAF',
                style: AppTypography.overline.copyWith(color: Colors.white60),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Amount
        Text('Amount (XAF)',
            style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        TextField(
          controller: _amountController,
          keyboardType: TextInputType.number,
          style: AppTypography.heading2,
          decoration: InputDecoration(
            hintText: '0',
            hintStyle: AppTypography.heading2.copyWith(color: AppColors.textHint),
            suffixText: 'XAF',
            suffixStyle:
                AppTypography.subtitle.copyWith(color: AppColors.textSecondary),
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.border)),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.border)),
            focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide:
                    const BorderSide(color: AppColors.primary, width: 1.5)),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          ),
        ),
        const SizedBox(height: 24),

        // Saved payment methods
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Payout Method',
                style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
            TextButton(
              onPressed: () {
                Navigator.pushNamed(
                  context,
                  '/payment-methods-setup',
                  arguments: {'mode': 'cashout'},
                );
              },
              child: const Text('Manage methods'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ...cashoutMethods.map((m) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _buildPaymentMethodTile(m),
            )),
        const SizedBox(height: 32),

        if (provider.error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Text(provider.error!,
                style: AppTypography.caption
                    .copyWith(color: AppColors.error)),
          ),

        LoadingButton(
          label: 'Request Withdrawal',
          isLoading: provider.isWithdrawing,
          onPressed: config == null ? null : () => _submit(context, provider, min, max),
        ),
      ],
    );
  }

  Widget _buildPaymentMethodTile(UserPaymentMethod method) {
    final isSelected = _selectedPaymentMethod?.id == method.id;
    return AppCard(
      onTap: () => setState(() => _selectedPaymentMethod = method),
      border: Border.all(
        color: isSelected ? AppColors.primary : AppColors.border,
        width: isSelected ? 1.5 : 1,
      ),
      shadow: const [],
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: isSelected ? AppColors.primarySurface : AppColors.inputFill,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(Icons.phone_android, size: 20,
                color: isSelected ? AppColors.primary : AppColors.textSecondary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(method.providerName, style: AppTypography.bodyMedium),
                Text(method.maskedAccountNumber, style: AppTypography.caption),
              ],
            ),
          ),
          if (method.isDefault)
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
          const SizedBox(width: 8),
          isSelected
              ? const Icon(Icons.check_circle, color: AppColors.primary, size: 22)
              : const Icon(Icons.radio_button_unchecked,
                  color: AppColors.textHint, size: 22),
        ],
      ),
    );
  }

  Widget _buildHistoryTab(CollectorEarningsProvider provider) {
    final history = provider.payoutHistory;

    if (provider.isLoading && history.isEmpty) {
      return const PayoutHistorySkeleton();
    }

    if (history.isEmpty) {
      return RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () => provider.loadPayoutHistory(),
        child: ListView(
          children: [
            SizedBox(height: MediaQuery.of(context).size.height * 0.3),
            Center(
              child: Text('No payout requests yet.',
                  style: AppTypography.body
                      .copyWith(color: AppColors.textSecondary)),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () => provider.loadPayoutHistory(),
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: history.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final p = history[i];
          return AppCard(
            shadow: const [],
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${p.amount.toStringAsFixed(0)} XAF',
                          style: AppTypography.bodyMedium
                              .copyWith(fontWeight: FontWeight.w700)),
                      Text(
                        '${p.method.replaceAll('_', ' ')} · ${_formatDate(p.createdAt)}',
                        style: AppTypography.caption,
                      ),
                      if (p.adminNote != null)
                        Text(p.adminNote!,
                            style: AppTypography.caption
                                .copyWith(color: AppColors.textSecondary)),
                    ],
                  ),
                ),
                _statusBadge(p.status),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _statusBadge(String status) {
    Color bg;
    Color fg;
    switch (status) {
      case 'PAID':
        bg = const Color(0xFFDCFCE7); fg = const Color(0xFF166534);
        break;
      case 'APPROVED':
        bg = const Color(0xFFDBEAFE); fg = const Color(0xFF1D4ED8);
        break;
      case 'REJECTED':
        bg = const Color(0xFFFEE2E2); fg = const Color(0xFFB91C1C);
        break;
      default:
        bg = const Color(0xFFFEF9C3); fg = const Color(0xFF854D0E);
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
          color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(status,
          style: AppTypography.overline.copyWith(
              color: fg, fontWeight: FontWeight.w600)),
    );
  }

  String _formatDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';

  Future<void> _submit(
    BuildContext context,
    CollectorEarningsProvider provider,
    double min,
    double max,
  ) async {
    final amount = double.tryParse(_amountController.text.trim());
    if (amount == null || amount <= 0) {
      _snack(context, 'Please enter a valid amount');
      return;
    }
    if (amount < min) {
      _snack(context, 'Minimum withdrawal is ${min.toStringAsFixed(0)} XAF');
      return;
    }
    if (amount > max) {
      _snack(context, 'Maximum withdrawal is ${max.toStringAsFixed(0)} XAF');
      return;
    }
    if (amount > provider.walletBalance) {
      _snack(context, 'Insufficient wallet balance');
      return;
    }
    if (_selectedPaymentMethod == null) {
      _snack(context, 'Please select a payment method');
      return;
    }

    final ok = await provider.requestWithdrawal(
      amount: amount,
      method: _selectedPaymentMethod!.paymentCode,
      accountNumber: _selectedPaymentMethod!.accountNumber,
      accountName: _selectedPaymentMethod!.accountName,
    );

    if (!mounted) return;

    if (ok) {
      _amountController.clear();
      _tabController.animateTo(1);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Withdrawal request submitted — pending admin approval'),
          backgroundColor: Color(0xFF166534),
        ),
      );
    }
  }

  void _snack(BuildContext context, String msg) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(msg)));
  }
}
