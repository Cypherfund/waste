import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/collector_earnings_provider.dart';
import '../../services/api/wallet_api.dart';
import '../../widgets/app_card.dart';
import '../../widgets/loading_button.dart';

class CollectorCashoutScreen extends StatefulWidget {
  const CollectorCashoutScreen({super.key});

  @override
  State<CollectorCashoutScreen> createState() => _CollectorCashoutScreenState();
}

class _CollectorCashoutScreenState extends State<CollectorCashoutScreen>
    with SingleTickerProviderStateMixin {
  final _amountController = TextEditingController();
  final _accountNumberController = TextEditingController();
  final _accountNameController = TextEditingController();
  String? _selectedMethodKey;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CollectorEarningsProvider>().loadWallet();
    });
  }

  @override
  void dispose() {
    _amountController.dispose();
    _accountNumberController.dispose();
    _accountNameController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CollectorEarningsProvider>();
    final config = provider.payoutConfig;
    final balance = provider.walletBalance;

    if (_selectedMethodKey == null && config != null && config.methods.isNotEmpty) {
      _selectedMethodKey = config.methods.first.key;
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
          _buildWithdrawTab(context, provider, config, balance),
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
  ) {
    final min = config?.minWithdrawal ?? 1000;
    final max = config?.maxWithdrawal ?? 500000;

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
              const SizedBox(height: 4),
              Text(
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

        // Payment method
        Text('Payment Method',
            style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        if (config == null)
          const Center(child: CircularProgressIndicator())
        else
          ...config.methods.map((m) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _buildMethodTile(m),
              )),
        const SizedBox(height: 24),

        // Account details
        Text('Account Details',
            style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        _buildTextField(_accountNumberController, 'Account / Phone Number'),
        const SizedBox(height: 10),
        _buildTextField(_accountNameController, 'Account Holder Name'),
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

  Widget _buildMethodTile(PayoutMethod method) {
    final isSelected = _selectedMethodKey == method.key;
    final icon = method.key == 'MOBILE_MONEY'
        ? Icons.phone_android
        : Icons.account_balance;
    return AppCard(
      onTap: () => setState(() => _selectedMethodKey = method.key),
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
            child: Icon(icon, size: 20,
                color: isSelected ? AppColors.primary : AppColors.textSecondary),
          ),
          const SizedBox(width: 12),
          Expanded(child: Text(method.label, style: AppTypography.bodyMedium)),
          isSelected
              ? const Icon(Icons.check_circle, color: AppColors.primary, size: 22)
              : const Icon(Icons.radio_button_unchecked,
                  color: AppColors.textHint, size: 22),
        ],
      ),
    );
  }

  Widget _buildTextField(TextEditingController ctrl, String hint) {
    return TextField(
      controller: ctrl,
      style: AppTypography.body,
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: AppTypography.body.copyWith(color: AppColors.textHint),
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.border)),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.border)),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }

  Widget _buildHistoryTab(CollectorEarningsProvider provider) {
    final history = provider.payoutHistory;
    if (history.isEmpty) {
      return Center(
        child: Text('No payout requests yet.',
            style: AppTypography.body.copyWith(color: AppColors.textSecondary)),
      );
    }
    return ListView.separated(
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
    if (_selectedMethodKey == null) {
      _snack(context, 'Please select a payment method');
      return;
    }
    if (_accountNumberController.text.trim().isEmpty) {
      _snack(context, 'Please enter your account / phone number');
      return;
    }

    final ok = await provider.requestWithdrawal(
      amount: amount,
      method: _selectedMethodKey!,
      accountNumber: _accountNumberController.text.trim(),
      accountName: _accountNameController.text.trim().isNotEmpty
          ? _accountNameController.text.trim()
          : null,
    );

    if (!mounted) return;

    if (ok) {
      _amountController.clear();
      _accountNumberController.clear();
      _accountNameController.clear();
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
