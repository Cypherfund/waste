import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

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

  bool _isLoadingLocation = true;
  Position? _currentPosition;

  String _area = 'Bonapriso, Douala';
  String _city = 'Cameroon';
  String _streetAddress = 'Rue 1278, Bonapriso';
  String _nearbyAddress = 'Near Total Bonapriso';

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
  }

  @override
  void dispose() {
    _instructionsController.dispose();
    super.dispose();
  }

  Future<void> _getCurrentLocation() async {
    setState(() {
      _isLoadingLocation = true;
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

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );

      final placemarks = await placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );

      if (!mounted) return;

      if (placemarks.isNotEmpty) {
        final place = placemarks.first;

        final street = _clean(place.street);
        final subLocality = _clean(place.subLocality);
        final locality = _clean(place.locality);
        final country = _clean(place.country);

        setState(() {
          _currentPosition = position;
          _area = [
            if (subLocality != null) subLocality,
            locality ?? 'Douala',
          ].join(', ');

          _city = country ?? 'Cameroon';

          _streetAddress = street ?? 'Rue 1278, Bonapriso';

          _nearbyAddress = subLocality != null
              ? 'Near $subLocality'
              : 'Near Total Bonapriso';

          _isLoadingLocation = false;
        });
      } else {
        _useFallbackLocation(position: position);
      }
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
      _area = 'Bonapriso, Douala';
      _city = 'Cameroon';
      _streetAddress = 'Rue 1278, Bonapriso';
      _nearbyAddress = 'Near Total Bonapriso';
      _isLoadingLocation = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final canContinue = !_isLoadingLocation && _streetAddress.isNotEmpty;

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
                              : Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _area,
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF111827),
                                ),
                              ),
                              const SizedBox(height: 5),
                              Text(
                                _city,
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
                            'Change',
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
