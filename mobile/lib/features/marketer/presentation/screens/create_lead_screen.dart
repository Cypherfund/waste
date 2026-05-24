import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/marketer_models.dart';
import '../../providers/marketer_provider.dart';

class CreateLeadScreen extends StatefulWidget {
  const CreateLeadScreen({super.key});

  @override
  State<CreateLeadScreen> createState() => _CreateLeadScreenState();
}

class _CreateLeadScreenState extends State<CreateLeadScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _areaCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  String _type = 'HOUSEHOLD';
  bool _submitting = false;
  String? _selectedCampaignId;
  List<MarketingCampaign> _campaigns = [];
  bool _loadingCampaigns = true;
  String _selectedCountryCode = '+237'; // Default to Cameroon
  final List<Map<String, String>> _countries = [
    {'code': '+237', 'name': 'Cameroon', 'flag': '🇨🇲'},
    {'code': '+234', 'name': 'Nigeria', 'flag': '🇳🇬'},
    {'code': '+233', 'name': 'Ghana', 'flag': '🇬🇭'},
    {'code': '+225', 'name': 'Ivory Coast', 'flag': '🇨🇮'},
    {'code': '+221', 'name': 'Senegal', 'flag': '🇸🇳'},
  ];

  @override
  void initState() {
    super.initState();
    _loadCampaigns();
  }

  Future<void> _loadCampaigns() async {
    try {
      final campaigns = await context.read<MarketerProvider>().activeCampaigns;
      if (campaigns.isEmpty) {
        await context.read<MarketerProvider>().loadActiveCampaigns();
      }
      setState(() {
        _campaigns = context.read<MarketerProvider>().activeCampaigns;
        _loadingCampaigns = false;
        // Auto-select if only one campaign
        if (_campaigns.length == 1) {
          _selectedCampaignId = _campaigns[0].id;
        }
      });
    } catch (e) {
      setState(() => _loadingCampaigns = false);
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _areaCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _submitting = true);
    try {
      await context.read<MarketerProvider>().createLead(
        CreateLeadRequest(
          name: _nameCtrl.text.trim(),
          phone: '$_selectedCountryCode${_phoneCtrl.text.trim()}',
          type: _type,
          area: _areaCtrl.text.trim().isEmpty ? null : _areaCtrl.text.trim(),
          notes: _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
          campaignId: _selectedCampaignId,
        ),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Lead created successfully!'), backgroundColor: Colors.green),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Add New Lead')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Type selector
              Text('Lead Type', style: Theme.of(context).textTheme.labelLarge),
              const SizedBox(height: 8),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'HOUSEHOLD', label: Text('Household'), icon: Icon(Icons.home)),
                  ButtonSegment(value: 'COLLECTOR', label: Text('Collector'), icon: Icon(Icons.local_shipping)),
                ],
                selected: {_type},
                onSelectionChanged: (s) => setState(() => _type = s.first),
              ),
              const SizedBox(height: 20),

              // Campaign selector
              if (_loadingCampaigns)
                const Center(child: CircularProgressIndicator())
              else if (_campaigns.isEmpty)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.orange.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.orange.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.warning_amber_rounded, color: Colors.orange.shade700, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'No active campaigns assigned. Please contact your administrator.',
                          style: TextStyle(color: Colors.orange.shade900, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                )
              else if (_campaigns.length > 1)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text('Campaign', style: Theme.of(context).textTheme.labelLarge),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: _selectedCampaignId,
                      decoration: const InputDecoration(
                        labelText: 'Select Campaign *',
                        prefixIcon: Icon(Icons.campaign),
                        border: OutlineInputBorder(),
                      ),
                      items: _campaigns.map((campaign) {
                        return DropdownMenuItem<String>(
                          value: campaign.id,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(campaign.name, style: const TextStyle(fontWeight: FontWeight.w500)),
                              Text(
                                '${campaign.territory ?? 'All territories'} • ${campaign.budgetAmount.toInt()} XAF',
                                style: const TextStyle(fontSize: 12, color: Colors.grey),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                      onChanged: (value) => setState(() => _selectedCampaignId = value),
                      validator: (v) => v == null || v.isEmpty ? 'Please select a campaign' : null,
                    ),
                    const SizedBox(height: 20),
                  ],
                )
              else
                // Auto-selected campaign - show info
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.green.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.check_circle, color: Colors.green.shade700, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Campaign: ${_campaigns[0].name}',
                              style: TextStyle(color: Colors.green.shade900, fontWeight: FontWeight.w500),
                            ),
                            Text(
                              '${_campaigns[0].territory ?? 'All territories'} • ${_campaigns[0].budgetAmount.toInt()} XAF',
                              style: TextStyle(color: Colors.green.shade700, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 20),

              TextFormField(
                controller: _nameCtrl,
                decoration: const InputDecoration(
                  labelText: 'Full Name *',
                  prefixIcon: Icon(Icons.person),
                  border: OutlineInputBorder(),
                ),
                validator: (v) => v == null || v.trim().isEmpty ? 'Name is required' : null,
                textCapitalization: TextCapitalization.words,
              ),
              const SizedBox(height: 16),

              Row(
                children: [
                  // Country Code Dropdown
                  Container(
                    width: 110,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedCountryCode,
                        isExpanded: true,
                        items: _countries.map((country) {
                          return DropdownMenuItem<String>(
                            value: country['code'],
                            child: Row(
                              children: [
                                Text(country['flag']!, style: const TextStyle(fontSize: 20)),
                                const SizedBox(width: 8),
                                Text(
                                  country['code']!,
                                  style: const TextStyle(fontSize: 12),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                        onChanged: (value) => setState(() => _selectedCountryCode = value!),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Phone Number Input
                  Expanded(
                    child: TextFormField(
                      controller: _phoneCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Phone Number *',
                        hintText: '6XX XXX XXX',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.phone,
                      validator: (v) {
                        if (v == null || v.trim().isEmpty) return 'Phone is required';
                        if (v.trim().length < 8) return 'Enter a valid phone number';
                        return null;
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _areaCtrl,
                decoration: const InputDecoration(
                  labelText: 'Area / Neighborhood',
                  prefixIcon: Icon(Icons.location_on),
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _notesCtrl,
                decoration: const InputDecoration(
                  labelText: 'Notes',
                  prefixIcon: Icon(Icons.note),
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 24),

              FilledButton.icon(
                onPressed: _submitting ? null : _submit,
                icon: _submitting
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.send),
                label: const Text('Create & Send Invite'),
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
