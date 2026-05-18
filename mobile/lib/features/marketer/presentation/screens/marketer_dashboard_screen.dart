import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../providers/marketer_provider.dart';

class MarketerDashboardScreen extends StatelessWidget {
  const MarketerDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => context.read<MarketerProvider>().loadDashboard(),
          ),
        ],
      ),
      body: Consumer<MarketerProvider>(
        builder: (context, provider, _) {
          if (provider.loading && provider.dashboard == null) {
            return const Center(child: CircularProgressIndicator());
          }

          final dash = provider.dashboard;
          if (dash == null) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(provider.error ?? 'Failed to load dashboard'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: provider.loadDashboard,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: provider.loadDashboard,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Welcome + Referral Code
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Welcome back!',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Text('Referral Code: ', style: TextStyle(color: Colors.grey)),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.green.shade50,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                dash.profile.referralCode,
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.green.shade800,
                                  fontFamily: 'monospace',
                                ),
                              ),
                            ),
                            const SizedBox(width: 4),
                            IconButton(
                              icon: const Icon(Icons.copy, size: 18),
                              onPressed: () {
                                Clipboard.setData(ClipboardData(text: dash.profile.referralCode));
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Referral code copied!')),
                                );
                              },
                            ),
                          ],
                        ),
                        if (dash.profile.territory != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text('Territory: ${dash.profile.territory}', style: const TextStyle(color: Colors.grey)),
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Today Stats
                Row(
                  children: [
                    _StatCard(
                      title: 'Today Leads',
                      value: '${dash.todayStats.leadsCreated}',
                      color: Colors.blue,
                    ),
                    const SizedBox(width: 12),
                    _StatCard(
                      title: 'Today Qualified',
                      value: '${dash.todayStats.leadsQualified}',
                      color: Colors.purple,
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Totals
                Row(
                  children: [
                    _StatCard(
                      title: 'Total Leads',
                      value: '${dash.totals.totalLeads}',
                      color: Colors.teal,
                    ),
                    const SizedBox(width: 12),
                    _StatCard(
                      title: 'Conversion',
                      value: '${dash.totals.conversionRate.toStringAsFixed(1)}%',
                      color: Colors.orange,
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Commissions
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Commissions', style: Theme.of(context).textTheme.titleSmall),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            _CommissionStat(label: 'Pending', amount: dash.commissions.pending, color: Colors.orange),
                            _CommissionStat(label: 'Approved', amount: dash.commissions.approved, color: Colors.blue),
                            _CommissionStat(label: 'Paid', amount: dash.commissions.paid, color: Colors.green),
                          ],
                        ),
                        const Divider(height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Total Earned', style: TextStyle(fontWeight: FontWeight.w600)),
                            Text(
                              '${dash.commissions.totalEarned.toStringAsFixed(0)} XAF',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Recent Leads
                if (dash.recentLeads.isNotEmpty) ...[
                  Text('Recent Leads', style: Theme.of(context).textTheme.titleSmall),
                  const SizedBox(height: 8),
                  ...dash.recentLeads.map((lead) => Card(
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: lead.type == 'HOUSEHOLD' ? Colors.blue.shade50 : Colors.orange.shade50,
                        child: Icon(
                          lead.type == 'HOUSEHOLD' ? Icons.home : Icons.local_shipping,
                          color: lead.type == 'HOUSEHOLD' ? Colors.blue : Colors.orange,
                          size: 20,
                        ),
                      ),
                      title: Text(lead.name),
                      subtitle: Text(lead.phone),
                      trailing: _leadStatusChip(lead.status),
                    ),
                  )),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _leadStatusChip(String status) {
    Color color;
    switch (status) {
      case 'INVITED': color = Colors.blue; break;
      case 'REGISTERED': color = Colors.green; break;
      case 'QUALIFIED': color = Colors.purple; break;
      case 'EXPIRED': color = Colors.grey; break;
      default: color = Colors.grey;
    }
    return Chip(
      label: Text(status, style: TextStyle(color: color, fontSize: 11)),
      backgroundColor: color.withValues(alpha: 0.1),
      padding: EdgeInsets.zero,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final Color color;

  const _StatCard({required this.title, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
              const SizedBox(height: 4),
              Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
            ],
          ),
        ),
      ),
    );
  }
}

class _CommissionStat extends StatelessWidget {
  final String label;
  final double amount;
  final Color color;

  const _CommissionStat({required this.label, required this.amount, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 11)),
        const SizedBox(height: 2),
        Text(
          amount.toStringAsFixed(0),
          style: TextStyle(fontWeight: FontWeight.bold, color: color),
        ),
        Text('XAF', style: TextStyle(color: Colors.grey.shade400, fontSize: 10)),
      ],
    );
  }
}
