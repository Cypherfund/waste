import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import '../../../../config/app_theme.dart';

class Address {
  final String id;
  final String label;
  final String address;
  final String? landmark;
  final bool isDefault;

  const Address({
    required this.id,
    required this.label,
    required this.address,
    this.landmark,
    this.isDefault = false,
  });
}

class AddressesScreen extends StatefulWidget {
  const AddressesScreen({super.key});

  @override
  State<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends State<AddressesScreen> {
  final List<Address> _addresses = [
    const Address(
      id: '1',
      label: 'Home',
      address: 'Rue de la Liberté, Bonanjo, Douala',
      landmark: 'Near Carrefour Market',
      isDefault: true,
    ),
    const Address(
      id: '2',
      label: 'Office',
      address: 'Avenue Charles de Gaulle, Akwa, Douala',
      landmark: 'Next to MTN Center',
    ),
    const Address(
      id: '3',
      label: 'Weekend House',
      address: 'Bastos, Yaoundé',
      landmark: 'Opposite Embassy',
    ),
  ];

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
          'Saved Addresses',
          style: TextStyle(
            color: Colors.black,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Addresses List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: _addresses.length,
              itemBuilder: (context, index) {
                final address = _addresses[index];
                return _buildAddressCard(address, index);
              },
            ),
          ),
          
          // Add Address Button
          _buildAddAddressButton(),
        ],
      ),
    );
  }
  
  Widget _buildAddressCard(Address address, int index) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: address.isDefault ? AppColors.primary : Colors.grey.shade200,
          width: address.isDefault ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  _getAddressIcon(address.label),
                  color: AppColors.primary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          address.label,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.black87,
                          ),
                        ),
                        if (address.isDefault) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Text(
                              'Default',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      address.address,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    if (address.landmark != null && address.landmark!.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        'Near: ${address.landmark}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade500,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              PopupMenuButton<String>(
                icon: Icon(Icons.more_vert, color: Colors.grey.shade600),
                onSelected: (value) {
                  _handleMenuAction(value, address, index);
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(
                    value: 'edit',
                    child: Row(
                      children: [
                        Icon(Icons.edit, size: 18),
                        SizedBox(width: 8),
                        Text('Edit'),
                      ],
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'delete',
                    child: Row(
                      children: [
                        Icon(Icons.delete, size: 18, color: Colors.red),
                        SizedBox(width: 8),
                        Text('Delete', style: TextStyle(color: Colors.red)),
                      ],
                    ),
                  ),
                  if (!address.isDefault)
                    const PopupMenuItem(
                      value: 'default',
                      child: Row(
                        children: [
                          Icon(Icons.star, size: 18),
                          SizedBox(width: 8),
                          Text('Set as Default'),
                        ],
                      ),
                    ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
  
  IconData _getAddressIcon(String label) {
    switch (label.toLowerCase()) {
      case 'home':
        return Icons.home;
      case 'office':
        return Icons.work;
      case 'weekend house':
        return Icons.cottage;
      default:
        return Icons.location_on;
    }
  }
  
  Widget _buildAddAddressButton() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: SafeArea(
        child: SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              elevation: 0,
            ),
            onPressed: _showAddAddressDialog,
            icon: const Icon(Icons.add),
            label: const Text(
              'Add New Address',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      ),
    );
  }
  
  void _handleMenuAction(String action, Address address, int index) {
    switch (action) {
      case 'edit':
        _showEditAddressDialog(address, index);
        break;
      case 'delete':
        _showDeleteConfirmDialog(address, index);
        break;
      case 'default':
        _setDefaultAddress(index);
        break;
    }
  }
  
  void _showAddAddressDialog() {
    _showAddressSheet(null);
  }

  void _showEditAddressDialog(Address address, int index) {
    _showAddressSheet(address, index: index);
  }

  void _showAddressSheet(Address? address, {int? index}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _AddressFormSheet(
        existing: address,
        onSave: (newAddress) {
          setState(() {
            if (index != null) {
              _addresses[index] = newAddress;
            } else {
              _addresses.add(newAddress);
            }
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(index == null ? 'Address added' : 'Address updated'),
              backgroundColor: AppColors.primary,
            ),
          );
        },
      ),
    );
  }
  
  void _showDeleteConfirmDialog(Address address, int index) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Text('Delete Address'),
        content: Text(
          'Are you sure you want to delete ${address.label}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              setState(() {
                _addresses.removeAt(index);
              });
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Address deleted')),
              );
            },
            child: Text(
              'Delete',
              style: TextStyle(color: Colors.red.shade600),
            ),
          ),
        ],
      ),
    );
  }
  
  void _setDefaultAddress(int index) {
    setState(() {
      for (int i = 0; i < _addresses.length; i++) {
        _addresses[i] = Address(
          id: _addresses[i].id,
          label: _addresses[i].label,
          address: _addresses[i].address,
          landmark: _addresses[i].landmark,
          isDefault: i == index,
        );
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Default address updated')),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Address form bottom sheet
// ─────────────────────────────────────────────────────────────────────────────

class _AddressFormSheet extends StatefulWidget {
  final Address? existing;
  final void Function(Address) onSave;

  const _AddressFormSheet({required this.onSave, this.existing});

  @override
  State<_AddressFormSheet> createState() => _AddressFormSheetState();
}

class _AddressFormSheetState extends State<_AddressFormSheet> {
  late final TextEditingController _labelCtrl;
  late final TextEditingController _addressCtrl;
  late final TextEditingController _landmarkCtrl;
  bool _loadingGps = false;
  String? _gpsError;

  @override
  void initState() {
    super.initState();
    _labelCtrl = TextEditingController(text: widget.existing?.label ?? '');
    _addressCtrl = TextEditingController(text: widget.existing?.address ?? '');
    _landmarkCtrl = TextEditingController(text: widget.existing?.landmark ?? '');
  }

  @override
  void dispose() {
    _labelCtrl.dispose();
    _addressCtrl.dispose();
    _landmarkCtrl.dispose();
    super.dispose();
  }

  Future<void> _useCurrentLocation() async {
    setState(() { _loadingGps = true; _gpsError = null; });
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        setState(() { _gpsError = 'Location permission denied.'; _loadingGps = false; });
        return;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      ).timeout(const Duration(seconds: 10));

      final placemarks = await placemarkFromCoordinates(pos.latitude, pos.longitude);
      if (placemarks.isNotEmpty) {
        final p = placemarks.first;
        final parts = [
          p.street,
          p.subLocality,
          p.locality,
        ].where((s) => s != null && s.isNotEmpty).toList();
        _addressCtrl.text = parts.join(', ');
      }
    } catch (e) {
      setState(() { _gpsError = 'Could not get location. Enter manually.'; });
    } finally {
      if (mounted) setState(() => _loadingGps = false);
    }
  }

  void _save() {
    final label = _labelCtrl.text.trim();
    final address = _addressCtrl.text.trim();
    if (label.isEmpty || address.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Label and address are required')),
      );
      return;
    }
    final saved = Address(
      id: widget.existing?.id ?? DateTime.now().millisecondsSinceEpoch.toString(),
      label: label,
      address: address,
      landmark: _landmarkCtrl.text.trim().isEmpty ? null : _landmarkCtrl.text.trim(),
      isDefault: widget.existing?.isDefault ?? false,
    );
    Navigator.pop(context);
    widget.onSave(saved);
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.fromLTRB(20, 16, 20, 20 + bottomInset),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle
            Center(
              child: Container(
                width: 36, height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              widget.existing == null ? 'Add Address' : 'Edit Address',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.black87),
            ),
            const SizedBox(height: 20),

            // Label
            _field(controller: _labelCtrl, label: 'Label', hint: 'Home, Office, etc.'),
            const SizedBox(height: 14),

            // Address + GPS button
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _field(
                  controller: _addressCtrl,
                  label: 'Address',
                  hint: 'Street, area, city',
                  maxLines: 2,
                ),
                const SizedBox(height: 10),
                SizedBox(
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: _loadingGps ? null : _useCurrentLocation,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primarySurface,
                      foregroundColor: AppColors.primary,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: _loadingGps
                        ? const SizedBox(
                            width: 18, height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.my_location_rounded, size: 20),
                    label: const Text('Use Current Location',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  ),
                ),
              ],
            ),
            if (_gpsError != null) ...[
              const SizedBox(height: 6),
              Text(_gpsError!,
                  style: const TextStyle(fontSize: 11, color: Colors.red)),
            ],
            const SizedBox(height: 14),

            // Landmark
            _field(
              controller: _landmarkCtrl,
              label: 'Landmark (optional)',
              hint: 'Near school, opposite market…',
            ),
            const SizedBox(height: 24),

            // Save button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Save Address',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _field({
    required TextEditingController controller,
    required String label,
    String? hint,
    int maxLines = 1,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(
                fontSize: 13, fontWeight: FontWeight.w600, color: Colors.black87)),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          maxLines: maxLines,
          style: const TextStyle(fontSize: 14),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade400),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            filled: true,
            fillColor: const Color(0xFFF9FAFB),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: AppColors.primary, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}
