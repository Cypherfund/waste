import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/marketer_models.dart';
import '../../providers/marketer_provider.dart';
import 'create_lead_screen.dart';
import '../../../../widgets/connectivity_dot.dart';

class MarketerLeadsScreen extends StatefulWidget {
  const MarketerLeadsScreen({super.key});

  @override
  State<MarketerLeadsScreen> createState() => _MarketerLeadsScreenState();
}

class _MarketerLeadsScreenState extends State<MarketerLeadsScreen> {
  String? _statusFilter;

  @override
  void initState() {
    super.initState();
    _loadLeads();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Reload if data is stale (2+ minutes old), matching collector pattern
    if (context.read<MarketerProvider>().isStale) {
      _loadLeads();
    }
  }

  void _loadLeads() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MarketerProvider>().loadLeads(status: _statusFilter);
    });
  }

  void _applyFilter(String? status) {
    setState(() => _statusFilter = status);
    context.read<MarketerProvider>().loadLeads(status: status);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Leads'),
        actions: [
          const Padding(
            padding: EdgeInsets.only(right: 4),
            child: Center(child: ConnectivityDot()),
          ),
          PopupMenuButton<String?>(
            icon: const Icon(Icons.filter_list),
            onSelected: _applyFilter,
            itemBuilder: (_) => [
              const PopupMenuItem(value: null, child: Text('All')),
              const PopupMenuItem(value: 'INVITED', child: Text('Invited')),
              const PopupMenuItem(value: 'REGISTERED', child: Text('Registered')),
              const PopupMenuItem(value: 'QUALIFIED', child: Text('Qualified')),
              const PopupMenuItem(value: 'EXPIRED', child: Text('Expired')),
            ],
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const CreateLeadScreen()),
        ),
        icon: const Icon(Icons.person_add),
        label: const Text('Add Lead'),
        backgroundColor: Colors.green,
      ),
      body: Consumer<MarketerProvider>(
        builder: (context, provider, _) {
          if (provider.loading && provider.leads.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.leads.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.people_outline, size: 64, color: Colors.grey.shade300),
                  const SizedBox(height: 16),
                  const Text('No leads yet', style: TextStyle(color: Colors.grey)),
                  const SizedBox(height: 8),
                  const Text('Tap + to add your first lead', style: TextStyle(color: Colors.grey, fontSize: 12)),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => provider.loadLeads(status: _statusFilter),
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: provider.leads.length,
              itemBuilder: (context, index) {
                final lead = provider.leads[index];
                return _LeadCard(lead: lead);
              },
            ),
          );
        },
      ),
    );
  }
}

class _LeadCard extends StatelessWidget {
  final GrowthLead lead;

  const _LeadCard({required this.lead});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: lead.type == 'HOUSEHOLD' ? Colors.blue.shade50 : Colors.orange.shade50,
          child: Icon(
            lead.type == 'HOUSEHOLD' ? Icons.home : Icons.local_shipping,
            color: lead.type == 'HOUSEHOLD' ? Colors.blue : Colors.orange,
            size: 20,
          ),
        ),
        title: Text(lead.name, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(lead.phone, style: const TextStyle(fontSize: 12)),
            if (lead.area != null)
              Text(lead.area!, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            _statusChip(lead.status),
            const SizedBox(height: 4),
            _smsChip(lead.smsStatus),
          ],
        ),
        isThreeLine: true,
        onTap: () {
          // Could navigate to lead detail
        },
      ),
    );
  }

  Widget _statusChip(String status) {
    Color color;
    switch (status) {
      case 'INVITED': color = Colors.blue; break;
      case 'REGISTERED': color = Colors.green; break;
      case 'QUALIFIED': color = Colors.purple; break;
      case 'EXPIRED': color = Colors.grey; break;
      default: color = Colors.grey;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(status, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600)),
    );
  }

  Widget _smsChip(String status) {
    Color color;
    IconData icon;
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
        color = Colors.green;
        icon = Icons.check_circle_outline;
        break;
      case 'FAILED':
        color = Colors.red;
        icon = Icons.error_outline;
        break;
      default:
        color = Colors.orange;
        icon = Icons.schedule;
    }
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: color),
        const SizedBox(width: 2),
        Text('SMS', style: TextStyle(color: color, fontSize: 9)),
      ],
    );
  }
}
