import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/marketer_models.dart';
import '../../providers/marketer_provider.dart';
import '../../../../services/api/wallet_api.dart';
import '../../../../widgets/connectivity_dot.dart';

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
          return const Center(child: CircularProgressIndicator());
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
          return const Center(child: CircularProgressIndicator());
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

  Future<void> _showPayoutDialog(BuildContext context) async {
    final provider = context.read<MarketerProvider>();
    if (provider.payoutConfig == null) {
      await provider.loadPayoutConfig();
    }

    if (!context.mounted) return;

    final amountCtrl = TextEditingController();
    final accountCtrl = TextEditingController();

    final List<PayoutMethod> methods = provider.payoutConfig?.methods.isNotEmpty == true
        ? provider.payoutConfig!.methods
        : [
            PayoutMethod(key: 'MTN_MOMO', label: 'MTN MoMo'),
            PayoutMethod(key: 'ORANGE_MONEY', label: 'Orange Money'),
          ];
    String method = methods.first.key;

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
              DropdownButtonFormField<String>(
                value: method,
                decoration: const InputDecoration(labelText: 'Method', border: OutlineInputBorder()),
                items: methods
                    .map((m) => DropdownMenuItem(value: m.key, child: Text(m.label)))
                    .toList(),
                onChanged: (v) => setDialogState(() => method = v!),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: accountCtrl,
                decoration: const InputDecoration(labelText: 'Account Number', border: OutlineInputBorder()),
                keyboardType: TextInputType.phone,
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                final amount = double.tryParse(amountCtrl.text);
                if (amount == null || amount <= 0 || accountCtrl.text.isEmpty) return;
                Navigator.pop(ctx);
                try {
                  await context.read<MarketerProvider>().requestPayout(
                    CreatePayoutRequest(amount: amount, method: method, accountNumber: accountCtrl.text),
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
