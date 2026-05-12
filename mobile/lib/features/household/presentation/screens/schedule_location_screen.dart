import 'dart:async';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

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
  final TextEditingController _instructionsController =
  TextEditingController();
  final TextEditingController _manualAddressController =
  TextEditingController();

  bool _isLoadingLocation = true;
  bool _useManualAddress = false;
  bool _gpsFailed = false;
  Position? _currentPosition;

  String _area = '';
  String _city = '';
  String _streetAddress = '';
  String _nearbyAddress = '';

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
  }

  @override
  void dispose() {
    _instructionsController.dispose();
    _manualAddressController.dispose();
    super.dispose();
  }

  Future<void> _getCurrentLocation() async {
    setState(() {
      _isLoadingLocation = true;
      _gpsFailed = false;
      _useManualAddress = false;
    });

    try {
      var permission = await Geolocator.checkPermission();

      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        _useFallbackLocation();
        return;
      }

      // Get position with timeout to prevent infinite loading
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      ).timeout(const Duration(seconds: 10), onTimeout: () {
        throw TimeoutException('Location fetch timed out');
      });

      final placemarks = await placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      ).timeout(const Duration(seconds: 5), onTimeout: () {
        throw TimeoutException('Geocoding timed out');
      });

      if (!mounted) return;

      if (placemarks.isNotEmpty) {
        final place = placemarks.first;

        final rawStreet = _clean(place.street);
        final isJustNumber = rawStreet != null && RegExp(r'^\d+$').hasMatch(rawStreet);
        final street = isJustNumber ? null : rawStreet;
        final subLocality = _clean(place.subLocality);
        final locality = _clean(place.locality);
        final country = _clean(place.country);

        setState(() {
          _currentPosition = position;
          _area = [
            if (subLocality != null) subLocality,
            if (locality != null) locality,
          ].join(', ');

          _city = country ?? '';

          _streetAddress = street ??
              [subLocality, locality]
                  .whereType<String>()
                  .join(', ');

          _nearbyAddress = subLocality != null
              ? 'Near $subLocality'
              : '';

          _isLoadingLocation = false;
        });
      } else {
        _useFallbackLocation(position: position);
      }
    } on TimeoutException catch (_) {
      _useFallbackLocation();
    } catch (_) {
      _useFallbackLocation();
    }
  }

  String? _clean(String? value) {
    if (value == null) return null;
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  void _useFallbackLocation({Position? position}) {
    if (!mounted) return;

    setState(() {
      _currentPosition = position;
      _area = '';
      _city = '';
      _streetAddress = '';
      _nearbyAddress = '';
      _gpsFailed = true;
      _useManualAddress = true;
      _isLoadingLocation = false;
    });
  }

  void _toggleAddressMode() {
    setState(() {
      _useManualAddress = !_useManualAddress;
      if (_useManualAddress) {
        _manualAddressController.text = _streetAddress;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final canContinue = !_isLoadingLocation && (_useManualAddress ? _manualAddressController.text.isNotEmpty : _streetAddress.isNotEmpty);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leadingWidth: 44,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            color: Color(0xFF111827),
            size: 16,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Schedule Pickup',
          style: TextStyle(
            color: Color(0xFF111827),
            fontSize: 13,
            fontWeight: FontWeight.w800,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            const Divider(
              height: 1,
              thickness: 1,
              color: Color(0xFFF0F2F0),
            ),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Pickup Address',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF111827),
                      ),
                    ),

                    const SizedBox(height: 14),

                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: _isLoadingLocation
                              ? const Text(
                            'Getting your location...',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF6B7280),
                            ),
                          )
                              : _gpsFailed
                                  ? Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          'Location detection failed',
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w800,
                                            color: Color(0xFFDC2626),
                                          ),
                                        ),
                                        const SizedBox(height: 5),
                                        const Text(
                                          'Please enter your address manually',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w500,
                                            color: Color(0xFF6B7280),
                                          ),
                                        ),
                                      ],
                                    )
                                  : Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _area.isNotEmpty ? _area : 'No address detected',
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w800,
                                            color: _area.isNotEmpty ? const Color(0xFF111827) : const Color(0xFF6B7280),
                                          ),
                                        ),
                                        const SizedBox(height: 5),
                                        Text(
                                          _city.isNotEmpty ? _city : '',
                                          style: const TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w500,
                                            color: Color(0xFF6B7280),
                                          ),
                                        ),
                                      ],
                                    ),
                        ),
                        GestureDetector(
                          onTap: _getCurrentLocation,
                          child: Text(
                            _useManualAddress ? 'Retry GPS' : 'Change',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: _toggleAddressMode,
                          child: Text(
                            _useManualAddress ? 'Use GPS' : 'Enter Manually',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 14),

                    _buildMapPreview(),

                    const SizedBox(height: 10),

                    _buildAddressSummaryCard(),

                    if (_useManualAddress || _gpsFailed) ...[
                      const SizedBox(height: 16),
                      Text(
                        _gpsFailed ? 'Enter your address (required)' : 'Enter your address',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF111827),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFF9FAFB),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: _gpsFailed ? const Color(0xFFDC2626) : const Color(0xFFE5E7EB),
                            width: _gpsFailed ? 2 : 1,
                          ),
                        ),
                        child: TextField(
                          controller: _manualAddressController,
                          decoration: InputDecoration(
                            hintText: _gpsFailed 
                                ? 'Please enter your complete address (e.g., Rue 1234, Makepe, Douala)'
                                : 'Enter your complete address',
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.all(12),
                            hintStyle: TextStyle(
                              color: _gpsFailed ? const Color(0xFFDC2626).withOpacity(0.5) : null,
                            ),
                          ),
                          onChanged: (value) {
                            setState(() {
                              _streetAddress = value;
                              _area = value;
                            });
                          },
                        ),
                      ),
                      if (_gpsFailed) ...[
                        const SizedBox(height: 8),
                        const Text(
                          'Address is required to continue',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFFDC2626),
                          ),
                        ),
                      ],
                    ],

                    const SizedBox(height: 24),

                    const Text(
                      'Add instructions (optional)',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF111827),
                      ),
                    ),

                    const SizedBox(height: 10),

                    _buildInstructionsInput(),
                  ],
                ),
              ),
            ),

            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
              child: SafeArea(
                top: false,
                child: SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: ElevatedButton(
                    onPressed: canContinue
                        ? () {
                      final args = widget.arguments ?? {};

                      Navigator.pushNamed(
                        context,
                        '/schedule-review',
                        arguments: {
                          ...args,
                          'locationAddress': _streetAddress,
                          'locationArea': _area,
                          'landmark': _instructionsController.text,
                          'locationLat': _currentPosition?.latitude,
                          'locationLng': _currentPosition?.longitude,
                        },
                      );
                    }
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: const Color(0xFFE0E0E0),
                      disabledForegroundColor: const Color(0xFF8A8A8A),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(9),
                      ),
                    ),
                    child: const Text(
                      'Continue',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMapPreview() {
    final LatLng fallbackLatLng = const LatLng(4.0511, 9.7679); // Douala fallback

    final LatLng selectedLatLng = _currentPosition == null
        ? fallbackLatLng
        : LatLng(
      _currentPosition!.latitude,
      _currentPosition!.longitude,
    );

    if (kIsWeb) {
      final mapsUrl = 'https://www.google.com/maps?q=${selectedLatLng.latitude},${selectedLatLng.longitude}';
      return Container(
        width: double.infinity,
        height: 210,
        decoration: BoxDecoration(
          color: const Color(0xFFEFF3F0),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.location_on_rounded, size: 36, color: AppColors.primary),
            const SizedBox(height: 8),
            Text(
              _streetAddress.isNotEmpty ? _streetAddress : 'Location selected',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF111827)),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            GestureDetector(
              onTap: () => launchUrl(Uri.parse(mapsUrl), mode: LaunchMode.externalApplication),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Text('Open in Maps', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      width: double.infinity,
      height: 210,
      decoration: BoxDecoration(
        color: const Color(0xFFEFF3F0),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: selectedLatLng,
              zoom: 15.5,
            ),
            markers: {
              Marker(
                markerId: const MarkerId('pickup_location'),
                position: selectedLatLng,
                icon: BitmapDescriptor.defaultMarkerWithHue(
                  BitmapDescriptor.hueGreen,
                ),
              ),
            },
            myLocationEnabled: false,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            mapToolbarEnabled: false,
            compassEnabled: false,
            rotateGesturesEnabled: false,
            tiltGesturesEnabled: false,
            scrollGesturesEnabled: true,
            zoomGesturesEnabled: true,
          ),

          if (_isLoadingLocation)
            Positioned.fill(
              child: Container(
                color: Colors.white.withValues(alpha: 0.65),
                child: Center(
                  child: SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.4,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildAddressSummaryCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(13, 11, 13, 11),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(9),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Row(
        children: [
          Expanded(
            child: _isLoadingLocation
                ? const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _SkeletonLine(width: 120),
                SizedBox(height: 8),
                _SkeletonLine(width: 170),
              ],
            )
                : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _streetAddress,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF111827),
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  _nearbyAddress,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF6B7280),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Icon(
            Icons.edit_outlined,
            size: 17,
            color: AppColors.primary,
          ),
        ],
      ),
    );
  }

  Widget _buildInstructionsInput() {
    return Container(
      width: double.infinity,
      height: 58,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(9),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: TextField(
        controller: _instructionsController,
        maxLines: 1,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: Color(0xFF111827),
        ),
        decoration: const InputDecoration(
          border: InputBorder.none,
          hintText: 'Gate code, landmark, floor, etc.',
          hintStyle: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: Color(0xFF9CA3AF),
          ),
          contentPadding: EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 20,
          ),
        ),
      ),
    );
  }
}

class _SkeletonLine extends StatelessWidget {
  final double width;

  const _SkeletonLine({
    required this.width,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: 9,
      decoration: BoxDecoration(
        color: const Color(0xFFE5E7EB),
        borderRadius: BorderRadius.circular(999),
      ),
    );
  }
}
