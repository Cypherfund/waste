import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/app_theme.dart';
import '../../models/job.dart';

class CollectorNavigateScreen extends StatefulWidget {
  final Job job;

  const CollectorNavigateScreen({super.key, required this.job});

  @override
  State<CollectorNavigateScreen> createState() =>
      _CollectorNavigateScreenState();
}

class _CollectorNavigateScreenState extends State<CollectorNavigateScreen> {
  GoogleMapController? _mapController;
  LatLng? _currentPosition;
  StreamSubscription<Position>? _positionStream;

  static const double _defaultZoom = 15.0;

  LatLng get _pickupLatLng {
    final lat = widget.job.locationLat;
    final lng = widget.job.locationLng;
    if (lat != null && lng != null) return LatLng(lat, lng);
    return const LatLng(4.0511, 9.7679);
  }

  @override
  void initState() {
    super.initState();
    _initLocation();
  }

  Future<void> _initLocation() async {
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        await Geolocator.requestPermission();
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );
      if (!mounted) return;
      setState(() {
        _currentPosition = LatLng(pos.latitude, pos.longitude);
      });
      _fitBounds();

      _positionStream = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 10,
        ),
      ).listen((pos) {
        if (!mounted) return;
        setState(() {
          _currentPosition = LatLng(pos.latitude, pos.longitude);
        });
      });
    } catch (e) {
      debugPrint('[Navigate] Location error: $e');
      // Fallback: use a position near the pickup
      setState(() {
        _currentPosition = LatLng(
          _pickupLatLng.latitude + 0.003,
          _pickupLatLng.longitude - 0.004,
        );
      });
    }
  }

  void _fitBounds() {
    if (_mapController == null || _currentPosition == null) return;
    Future.delayed(const Duration(milliseconds: 400), () {
      if (!mounted || _mapController == null) return;
      _mapController!.animateCamera(
        CameraUpdate.newLatLngBounds(
          _boundsFromLatLngList([_currentPosition!, _pickupLatLng]),
          60,
        ),
      );
    });
  }

  void _recenter() {
    if (_currentPosition != null && _mapController != null) {
      _mapController!.animateCamera(
        CameraUpdate.newLatLngZoom(_currentPosition!, _defaultZoom),
      );
    }
  }

  Future<void> _callCustomer() async {
    final phone = widget.job.householdPhone ?? '';
    if (phone.isEmpty) return;
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  void _endNavigation() {
    Navigator.pushReplacementNamed(
      context,
      '/collector-arrived',
      arguments: widget.job,
    );
  }

  LatLngBounds _boundsFromLatLngList(List<LatLng> list) {
    double minLat = list.first.latitude;
    double maxLat = list.first.latitude;
    double minLng = list.first.longitude;
    double maxLng = list.first.longitude;

    for (final point in list) {
      if (point.latitude < minLat) minLat = point.latitude;
      if (point.latitude > maxLat) maxLat = point.latitude;
      if (point.longitude < minLng) minLng = point.longitude;
      if (point.longitude > maxLng) maxLng = point.longitude;
    }

    return LatLngBounds(
      southwest: LatLng(minLat, minLng),
      northeast: LatLng(maxLat, maxLng),
    );
  }

  List<LatLng> _buildRoutePoints() {
    if (_currentPosition == null) return [];
    final cur = _currentPosition!;
    final dest = _pickupLatLng;
    // Simple L-shaped route approximation
    return [
      cur,
      LatLng(cur.latitude, dest.longitude),
      dest,
    ];
  }

  @override
  void dispose() {
    _positionStream?.cancel();
    _mapController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // Map fills the whole screen
          Positioned.fill(
            child: GoogleMap(
              initialCameraPosition: CameraPosition(
                target: _pickupLatLng,
                zoom: _defaultZoom,
              ),
              onMapCreated: (controller) {
                _mapController = controller;
                _fitBounds();
              },
              markers: {
                Marker(
                  markerId: const MarkerId('destination'),
                  position: _pickupLatLng,
                  icon: BitmapDescriptor.defaultMarkerWithHue(
                    BitmapDescriptor.hueGreen,
                  ),
                  infoWindow: const InfoWindow(title: 'Pickup location'),
                ),
                if (_currentPosition != null)
                  Marker(
                    markerId: const MarkerId('collector'),
                    position: _currentPosition!,
                    icon: BitmapDescriptor.defaultMarkerWithHue(
                      BitmapDescriptor.hueAzure,
                    ),
                    infoWindow: const InfoWindow(title: 'You'),
                  ),
              },
              polylines: {
                if (_currentPosition != null)
                  Polyline(
                    polylineId: const PolylineId('route'),
                    points: _buildRoutePoints(),
                    color: AppColors.primary,
                    width: 5,
                    patterns: [],
                  ),
              },
              myLocationEnabled: true,
              myLocationButtonEnabled: false,
              zoomControlsEnabled: false,
              mapToolbarEnabled: false,
              compassEnabled: false,
            ),
          ),

          // Top bar: back + title
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              color: Colors.white,
              child: SafeArea(
                bottom: false,
                child: SizedBox(
                  height: 48,
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(
                          Icons.arrow_back_ios_new_rounded,
                          size: 16,
                          color: Color(0xFF111827),
                        ),
                        onPressed: () => Navigator.pop(context),
                      ),
                      const Expanded(
                        child: Text(
                          'Navigate',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF111827),
                          ),
                        ),
                      ),
                      const SizedBox(width: 48),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // Turn-by-turn direction banner
          Positioned(
            top: MediaQuery.of(context).padding.top + 48,
            left: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: AppColors.primarySurface,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      Icons.turn_left_rounded,
                      color: AppColors.primary,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Turn left in 200 m',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF111827),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          widget.job.locationAddress,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF6B7280),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Bottom panel
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(20),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 16,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 18, 20, 12),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Destination info
                      Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: AppColors.primarySurface,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              Icons.location_on_rounded,
                              color: AppColors.primary,
                              size: 22,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  widget.job.locationAddress,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF111827),
                                  ),
                                ),
                                const SizedBox(height: 3),
                                const Text(
                                  '2.4 km  •  8 min ETA',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF6B7280),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 16),

                      // End Navigation button
                      SizedBox(
                        width: double.infinity,
                        height: 44,
                        child: ElevatedButton.icon(
                          onPressed: _endNavigation,
                          icon: const Icon(Icons.flag_rounded, size: 18),
                          label: const Text(
                            'End Navigation',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 10),

                      // Re-center + Call Customer
                      Row(
                        children: [
                          Expanded(
                            child: SizedBox(
                              height: 40,
                              child: OutlinedButton.icon(
                                onPressed: _recenter,
                                icon: Icon(
                                  Icons.my_location_rounded,
                                  size: 16,
                                  color: AppColors.primary,
                                ),
                                label: Text(
                                  'Re-center',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.primary,
                                  ),
                                ),
                                style: OutlinedButton.styleFrom(
                                  side: BorderSide(
                                    color: AppColors.border,
                                    width: 1,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: SizedBox(
                              height: 40,
                              child: OutlinedButton.icon(
                                onPressed: _callCustomer,
                                icon: Icon(
                                  Icons.phone_rounded,
                                  size: 16,
                                  color: AppColors.primary,
                                ),
                                label: Text(
                                  'Call Customer',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.primary,
                                  ),
                                ),
                                style: OutlinedButton.styleFrom(
                                  side: BorderSide(
                                    color: AppColors.border,
                                    width: 1,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
