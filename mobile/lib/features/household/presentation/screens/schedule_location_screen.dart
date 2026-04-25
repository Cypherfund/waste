import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import '../../../../config/app_theme.dart';

class ScheduleLocationScreen extends StatefulWidget {
  final Map<String, dynamic>? arguments;

  const ScheduleLocationScreen({
    super.key,
    this.arguments,
  });

  @override
  State<ScheduleLocationScreen> createState() => _ScheduleLocationScreenState();
}

class _ScheduleLocationScreenState extends State<ScheduleLocationScreen> {
  final TextEditingController _addressController = TextEditingController();
  final TextEditingController _landmarkController = TextEditingController();
  
  bool _isLoadingLocation = false;
  bool _useCurrentLocation = true;
  Position? _currentPosition;
  // ignore: unused_field
  String? _currentAddress;

  @override
  void initState() {
    super.initState();
    if (_useCurrentLocation) {
      _getCurrentLocation();
    }
  }

  @override
  void dispose() {
    _addressController.dispose();
    _landmarkController.dispose();
    super.dispose();
  }

  Future<void> _getCurrentLocation() async {
    setState(() {
      _isLoadingLocation = true;
    });

    try {
      // Check permission
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          _showLocationError('Location permissions are denied');
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        _showLocationError(
          'Location permissions are permanently denied. Please enable them in settings.',
        );
        return;
      }

      // Get current position
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );
      
      // Get address from coordinates
      final placemarks = await placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );

      if (placemarks.isNotEmpty && mounted) {
        final place = placemarks[0];
        final address = _formatAddress(place);
        
        setState(() {
          _currentPosition = position;
          _currentAddress = address;
          _addressController.text = address;
          _isLoadingLocation = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingLocation = false;
        });
        _showLocationError('Failed to get location. Please enter manually.');
      }
    }
  }

  String _formatAddress(Placemark place) {
    final parts = <String>[];
    
    if (place.street != null && place.street!.isNotEmpty) {
      parts.add(place.street!);
    }
    if (place.subLocality != null && place.subLocality!.isNotEmpty) {
      parts.add(place.subLocality!);
    }
    if (place.locality != null && place.locality!.isNotEmpty) {
      parts.add(place.locality!);
    }
    
    return parts.isNotEmpty ? parts.join(', ') : 'Unknown location';
  }

  void _showLocationError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red.shade600,
      ),
    );
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
          'Schedule Pickup',
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
          // Progress Indicator
          _buildProgressIndicator(),
          
          // Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Pickup address',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Where should we collect your waste?',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.grey.shade600,
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // Location Options
                  _buildLocationOptions(),
                  
                  const SizedBox(height: 24),
                  
                  // Address Input
                  _buildAddressInput(),
                  
                  const SizedBox(height: 20),
                  
                  // Landmark Input
                  _buildLandmarkInput(),
                  
                  const SizedBox(height: 24),
                  
                  // Saved Addresses
                  _buildSavedAddresses(),
                ],
              ),
            ),
          ),
          
          // Continue Button
          _buildContinueButton(),
        ],
      ),
    );
  }

  Widget _buildProgressIndicator() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Row(
        children: [
          _buildProgressStep(1, 'Type', false, true),
          _buildProgressLine(true),
          _buildProgressStep(2, 'Schedule', false, true),
          _buildProgressLine(true),
          _buildProgressStep(3, 'Location', true, false),
          _buildProgressLine(false),
          _buildProgressStep(4, 'Review', false, false),
        ],
      ),
    );
  }

  Widget _buildProgressStep(int step, String label, bool isActive, bool isCompleted) {
    return Expanded(
      child: Column(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isActive || isCompleted
                  ? AppColors.primary
                  : Colors.grey.shade300,
            ),
            child: Center(
              child: isCompleted
                  ? const Icon(Icons.check, color: Colors.white, size: 16)
                  : Text(
                      step.toString(),
                      style: TextStyle(
                        color: isActive ? Colors.white : Colors.grey.shade600,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: isActive ? AppColors.primary : Colors.grey.shade500,
              fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressLine(bool isCompleted) {
    return Expanded(
      child: Container(
        height: 2,
        color: isCompleted ? AppColors.primary : Colors.grey.shade300,
        margin: const EdgeInsets.only(bottom: 20),
      ),
    );
  }

  Widget _buildLocationOptions() {
    return Row(
      children: [
        Expanded(
          child: _buildLocationOption(
            title: 'Use current location',
            icon: Icons.my_location,
            isSelected: _useCurrentLocation,
            onTap: () {
              setState(() {
                _useCurrentLocation = true;
              });
              _getCurrentLocation();
            },
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildLocationOption(
            title: 'Enter manually',
            icon: Icons.edit_location,
            isSelected: !_useCurrentLocation,
            onTap: () {
              setState(() {
                _useCurrentLocation = false;
                _addressController.clear();
                _currentPosition = null;
                _currentAddress = null;
              });
            },
          ),
        ),
      ],
    );
  }

  Widget _buildLocationOption({
    required String title,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryLight.withValues(alpha: 0.1) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.primary : Colors.grey.shade300,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              color: isSelected ? AppColors.primary : Colors.grey.shade600,
              size: 24,
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: TextStyle(
                fontSize: 14,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                color: isSelected ? AppColors.primary : Colors.grey.shade700,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAddressInput() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Street address',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.grey.shade700,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: TextField(
            controller: _addressController,
            enabled: !_isLoadingLocation,
            maxLines: 2,
            decoration: InputDecoration(
              hintText: _useCurrentLocation 
                  ? 'Getting your location...' 
                  : 'Enter your complete address',
              hintStyle: TextStyle(color: Colors.grey.shade400),
              prefixIcon: Padding(
                padding: const EdgeInsets.only(left: 16, right: 12),
                child: Icon(
                  Icons.location_on_outlined,
                  color: AppColors.primary,
                ),
              ),
              suffixIcon: _isLoadingLocation
                  ? const Padding(
                      padding: EdgeInsets.all(16),
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                        ),
                      ),
                    )
                  : null,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.all(16),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLandmarkInput() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Nearby landmark (optional)',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.grey.shade700,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: TextField(
            controller: _landmarkController,
            decoration: InputDecoration(
              hintText: 'e.g., Next to Carrefour Market',
              hintStyle: TextStyle(color: Colors.grey.shade400),
              prefixIcon: Padding(
                padding: const EdgeInsets.only(left: 16, right: 12),
                child: Icon(
                  Icons.place_outlined,
                  color: Colors.grey.shade600,
                ),
              ),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.all(16),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSavedAddresses() {
    // In a real app, these would come from user's saved addresses
    final savedAddresses = [
      {
        'label': 'Home',
        'address': 'Rue de la Liberté, Bonanjo, Douala',
        'icon': Icons.home,
      },
      {
        'label': 'Office',
        'address': 'Avenue Charles de Gaulle, Akwa, Douala',
        'icon': Icons.work,
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Saved addresses',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.grey.shade700,
          ),
        ),
        const SizedBox(height: 12),
        ...savedAddresses.map((address) => _buildSavedAddressCard(
          label: address['label'] as String,
          address: address['address'] as String,
          icon: address['icon'] as IconData,
        )),
      ],
    );
  }

  Widget _buildSavedAddressCard({
    required String label,
    required String address,
    required IconData icon,
  }) {
    return GestureDetector(
      onTap: () {
        setState(() {
          _addressController.text = address;
          _useCurrentLocation = false;
        });
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.primaryLight.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                color: AppColors.primary,
                size: 20,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    address,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              color: Colors.grey.shade400,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContinueButton() {
    final canContinue = _addressController.text.isNotEmpty && !_isLoadingLocation;
    
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
        top: false,
        child: SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: canContinue
                  ? AppColors.primary
                  : Colors.grey.shade300,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              elevation: 0,
            ),
            onPressed: canContinue
                ? () {
                    final args = widget.arguments ?? {};
                    Navigator.pushNamed(
                      context,
                      '/schedule-review',
                      arguments: {
                        ...args,
                        'locationAddress': _addressController.text,
                        'landmark': _landmarkController.text,
                        'locationLat': _currentPosition?.latitude,
                        'locationLng': _currentPosition?.longitude,
                      },
                    );
                  }
                : null,
            child: Text(
              'Continue',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: canContinue ? Colors.white : Colors.grey.shade600,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
