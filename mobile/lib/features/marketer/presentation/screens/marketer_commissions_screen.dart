import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/marketer_models.dart';
import '../../providers/marketer_provider.dart';
import '../../../../providers/user_payment_methods_provider.dart';
import '../../../../services/api/wallet_api.dart';
import '../../../../widgets/connectivity_dot.dart';
import '../../../../widgets/skeleton_loader.dart';

class MarketerCommissionsScreen extends StatefulWidget {
  const MarketerCommissionsScreen({super.key});

  @override
  State<MarketerCommissionsScreen> createState() => _MarketerCommissionsScreenState();
}

class _MarketerCommissionsScreenState extends State<MarketerCommissionsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MarketerProvider>().loadCommissions();
      context.read<MarketerProvider>().loadPayouts();
      context.read<UserPaymentMethodsProvider>().loadMethods(usage: 'CASHOUT');
    });
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Earnings'),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 8),
            child: Center(child: ConnectivityDot()),
          ),
        ],
        bottom: TabBar(
          controller: _tabCtrl,
          tabs: const [
            Tab(text: 'Commissions'),
            Tab(text: 'Payouts'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [
          _CommissionsTab(),
          _PayoutsTab(),
        ],
      ),
    );
  }
}

class _CommissionsTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer<MarketerProvider>(
      builder: (context, provider, _) {
        if (provider.loading && provider.commissions.isEmpty) {
          return _buildCommissionsSkeleton();
        }

        if (provider.commissions.isEmpty) {
          return const Center(child: Text('No commissions yet', style: TextStyle(color: Colors.grey)));
        }

        return RefreshIndicator(
          onRefresh: provider.loadCommissions,
          child: ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: provider.commissions.length,
            itemBuilder: (context, index) {
              final c = provider.commissions[index];
              return _CommissionCard(commission: c);
            },
          ),
        );
      },
    );
  }

  Widget _buildCommissionsSkeleton() {
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: 5,
      itemBuilder: (context, index) {
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: SkeletonLoader(width: 48, height: 48, borderRadius: BorderRadius.circular(24)),
            title: SkeletonLoader(width: 120, height: 16, borderRadius: BorderRadius.circular(4)),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 8),
                SkeletonLoader(width: 100, height: 14, borderRadius: BorderRadius.circular(4)),
                const SizedBox(height: 4),
                SkeletonLoader(width: 80, height: 12, borderRadius: BorderRadius.circular(4)),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _CommissionCard extends StatelessWidget {
  final CommissionItem commission;

  const _CommissionCard({required this.commission});

  @override
  Widget build(BuildContext context) {
    Color statusColor;
    switch (commission.status) {
      case 'PENDING': statusColor = Colors.orange; break;
      case 'APPROVED': statusColor = Colors.blue; break;
      case 'PAID': statusColor = Colors.green; break;
      case 'REJECTED': statusColor = Colors.red; break;
      default: statusColor = Colors.grey;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: statusColor.withValues(alpha: 0.1),
          child: Icon(Icons.monetization_on, color: statusColor, size: 20),
        ),
        title: Text(
          '${commission.amount.toStringAsFixed(0)} XAF',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(
          commission.triggerType.replaceAll('_', ' '),
          style: const TextStyle(fontSize: 12),
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: statusColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Text(
            commission.status,
            style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.w600),
          ),
        ),
      ),
    );
  }
}

class _PayoutsTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer<MarketerProvider>(
      builder: (context, provider, _) {
        if (provider.loading && provider.payouts.isEmpty) {
          return _buildPayoutsSkeleton();
        }

        return Column(
          children: [
            // Request Payout button
            Padding(
              padding: const EdgeInsets.all(12),
              child: SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _showPayoutDialog(context),
                  icon: const Icon(Icons.account_balance_wallet),
                  label: const Text('Request Payout'),
                ),
              ),
            ),

            if (provider.payouts.isEmpty)
              const Expanded(
                child: Center(child: Text('No payout requests yet', style: TextStyle(color: Colors.grey))),
              )
            else
              Expanded(
                child: RefreshIndicator(
                  onRefresh: provider.loadPayouts,
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    itemCount: provider.payouts.length,
                    itemBuilder: (context, index) {
                      final p = provider.payouts[index];
                      return _PayoutCard(payout: p);
                    },
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _buildPayoutsSkeleton() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: SkeletonLoader(width: double.infinity, height: 48, borderRadius: BorderRadius.circular(8)),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: 5,
            itemBuilder: (context, index) {
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: SkeletonLoader(width: 48, height: 48, borderRadius: BorderRadius.circular(24)),
                  title: SkeletonLoader(width: 100, height: 16, borderRadius: BorderRadius.circular(4)),
                  subtitle: SkeletonLoader(width: 120, height: 14, borderRadius: BorderRadius.circular(4)),
                  trailing: SkeletonLoader(width: 60, height: 24, borderRadius: BorderRadius.circular(4)),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Future<void> _showPayoutDialog(BuildContext context) async {
    final provider = context.read<MarketerProvider>();
    final paymentMethodsProvider = context.read<UserPaymentMethodsProvider>();
    if (provider.payoutConfig == null) {
      await provider.loadPayoutConfig();
    }

    if (!context.mounted) return;

    final amountCtrl = TextEditingController();
    UserPaymentMethod? selectedMethod;

    final cashoutMethods = paymentMethodsProvider.cashoutMethods;
    if (cashoutMethods.isNotEmpty) {
      selectedMethod = paymentMethodsProvider.defaultCashoutMethod ?? cashoutMethods.first;
    }

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Request Payout'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: amountCtrl,
                decoration: const InputDecoration(labelText: 'Amount (XAF)', border: OutlineInputBorder()),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              if (cashoutMethods.isEmpty)
                Column(
                  children: [
                    const Text('No payout methods saved.'),
                    const SizedBox(height: 8),
                    TextButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        Navigator.pushNamed(
                          context,
                          '/payment-methods-setup',
                          arguments: {'mode': 'cashout'},
                        );
                      },
                      icon: const Icon(Icons.add, size: 16),
                      label: const Text('Add payout method'),
                    ),
                  ],
                )
              else
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Payout Method', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    ...cashoutMethods.map((m) => RadioListTile<UserPaymentMethod>(
                      title: Text(m.providerName),
                      subtitle: Text(m.maskedAccountNumber),
                      value: m,
                      groupValue: selectedMethod,
                      onChanged: (v) => setDialogState(() => selectedMethod = v),
                      contentPadding: EdgeInsets.zero,
                    )),
                  ],
                ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                final amount = double.tryParse(amountCtrl.text);
                if (amount == null || amount <= 0 || selectedMethod == null) return;
                Navigator.pop(ctx);
                try {
                  await context.read<MarketerProvider>().requestPayout(
                    CreatePayoutRequest(
                      amount: amount,
                      method: selectedMethod!.paymentCode,
                      accountNumber: selectedMethod!.accountNumber,
                    ),
                  );
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Payout requested!'), backgroundColor: Colors.green),
                    );
                  }
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
                    );
                  }
                }
              },
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );
  }
}

class _PayoutCard extends StatelessWidget {
  final PayoutItem payout;

  const _PayoutCard({required this.payout});

  @override
  Widget build(BuildContext context) {
    Color statusColor;
    switch (payout.status) {
      case 'PENDING': statusColor = Colors.orange; break;
      case 'APPROVED': statusColor = Colors.blue; break;
      case 'PAID': statusColor = Colors.green; break;
      case 'REJECTED': statusColor = Colors.red; break;
      default: statusColor = Colors.grey;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: statusColor.withValues(alpha: 0.1),
          child: Icon(Icons.account_balance_wallet, color: statusColor, size: 20),
        ),
        title: Text(
          '${payout.amount.toStringAsFixed(0)} XAF',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text('${payout.method} • ${payout.accountNumber}', style: const TextStyle(fontSize: 12)),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: statusColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Text(
            payout.status,
            style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.w600),
          ),
        ),
      ),
    );
  }
}
