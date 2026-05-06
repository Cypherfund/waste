import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../../config/app_theme.dart';
import '../../../../models/job.dart';
import '../../../../providers/job_provider.dart';

class BookingStatusOnTheWayScreen extends StatefulWidget {
  final String jobId;

  const BookingStatusOnTheWayScreen({
    super.key,
    required this.jobId,
  });

  @override
  State<BookingStatusOnTheWayScreen> createState() =>
      _BookingStatusOnTheWayScreenState();
}

class _BookingStatusOnTheWayScreenState
    extends State<BookingStatusOnTheWayScreen> {
  Timer? _refreshTimer;
  GoogleMapController? _mapController;

  static const LatLng _fallbackPickupLatLng = LatLng(4.0511, 9.7679);
  static const LatLng _fallbackCollectorLatLng = LatLng(4.0540, 9.7635);

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshJobStatus();
    });

    _refreshTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      _refreshJobStatus();
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _mapController?.dispose();
    super.dispose();
  }

  Future<void> _refreshJobStatus() async {
    if (!mounted) return;

    final jobProvider = context.read<JobProvider>();
    await jobProvider.refreshJob(widget.jobId);

    final job = jobProvider.getJob(widget.jobId);

    if (!mounted || job == null) return;

    if (job.status == JobStatus.completed) {
      Navigator.pushReplacementNamed(
        context,
        '/booking-status-completed',
        arguments: job.id,
      );
    }

    if (job.status == JobStatus.cancelled) {
      Navigator.pushReplacementNamed(
        context,
        '/booking-cancelled',
        arguments: job.id,
      );
    }
  }

  LatLng _pickupLatLng(Job job) {
    final lat = job.locationLat;
    final lng = job.locationLng;

    if (lat != null && lng != null) {
      return LatLng(lat, lng);
    }

    return _fallbackPickupLatLng;
  }

  LatLng _collectorLatLng(Job job) {
    final pickup = _pickupLatLng(job);

    return LatLng(
      pickup.latitude + 0.003,
      pickup.longitude - 0.004,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leadingWidth: 42,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            color: Color(0xFF111827),
            size: 16,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'My Booking',
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
        child: Consumer<JobProvider>(
          builder: (context, jobProvider, _) {
            final job = jobProvider.getJob(widget.jobId);

            if (job == null) {
              return Center(
                child: CircularProgressIndicator(
                  color: AppColors.primary,
                ),
              );
            }

            return RefreshIndicator(
              color: AppColors.primary,
              onRefresh: _refreshJobStatus,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                child: Column(
                  children: [
                    Text(
                      'On the way',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                        color: AppColors.primary,
                      ),
                    ),

                    const SizedBox(height: 12),

                    const Text(
                      'Collector is heading to you',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.35,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF6B7280),
                      ),
                    ),

                    const SizedBox(height: 14),

                    _buildRealMapCard(job),

                    const SizedBox(height: 8),

                    _buildEtaRow(),

                    const SizedBox(height: 10),

                    _buildBookingInfoCard(job),

                    const SizedBox(height: 10),

                    _buildTrackButton(job),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildRealMapCard(Job job) {
    final pickupLatLng = _pickupLatLng(job);
    final collectorLatLng = _collectorLatLng(job);

    return Container(
      width: double.infinity,
      height: 128,
      decoration: BoxDecoration(
        color: const Color(0xFFEFF3F0),
        borderRadius: BorderRadius.circular(9),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      clipBehavior: Clip.antiAlias,
      child: GoogleMap(
        initialCameraPosition: CameraPosition(
          target: LatLng(
            (pickupLatLng.latitude + collectorLatLng.latitude) / 2,
            (pickupLatLng.longitude + collectorLatLng.longitude) / 2,
          ),
          zoom: 14.5,
        ),
        onMapCreated: (controller) {
          _mapController = controller;

          Future.delayed(const Duration(milliseconds: 350), () {
            if (!mounted) return;

            controller.animateCamera(
              CameraUpdate.newLatLngBounds(
                _boundsFromLatLngList([pickupLatLng, collectorLatLng]),
                44,
              ),
            );
          });
        },
        markers: {
          Marker(
            markerId: const MarkerId('pickup'),
            position: pickupLatLng,
            icon: BitmapDescriptor.defaultMarkerWithHue(
              BitmapDescriptor.hueGreen,
            ),
            infoWindow: const InfoWindow(title: 'Pickup location'),
          ),
          Marker(
            markerId: const MarkerId('collector'),
            position: collectorLatLng,
            icon: BitmapDescriptor.defaultMarkerWithHue(
              BitmapDescriptor.hueAzure,
            ),
            infoWindow: const InfoWindow(title: 'Collector'),
          ),
        },
        polylines: {
          Polyline(
            polylineId: const PolylineId('collector_route'),
            points: [
              collectorLatLng,
              LatLng(
                collectorLatLng.latitude,
                pickupLatLng.longitude,
              ),
              pickupLatLng,
            ],
            color: const Color(0xFF2563EB),
            width: 4,
          ),
        },
        myLocationEnabled: false,
        myLocationButtonEnabled: false,
        zoomControlsEnabled: false,
        mapToolbarEnabled: false,
        compassEnabled: false,
        rotateGesturesEnabled: false,
        tiltGesturesEnabled: false,
      ),
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

  Widget _buildEtaRow() {
    return Row(
      children: const [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'ETA',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF6B7280),
                ),
              ),
              SizedBox(height: 4),
              Text(
                '10 min',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF111827),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBookingInfoCard(Job job) {
    final date = DateTime.tryParse(job.scheduledDate);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(9),
        border: Border.all(color: const Color(0xFFE5E7EB)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.025),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.calendar_today_outlined,
                      size: 16,
                      color: Color(0xFF6B7280),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        date == null
                            ? '${job.scheduledDate}\n${job.scheduledTime}'
                            : '${DateFormat('EEE, d MMM yyyy').format(date)}\n${job.scheduledTime}',
                        style: const TextStyle(
                          fontSize: 11,
                          height: 1.45,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF111827),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                'Ref: #KTR-${_shortId(job.id)}',
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF9CA3AF),
                ),
              ),
            ],
          ),

          const SizedBox(height: 13),

          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.location_on_outlined,
                size: 16,
                color: Color(0xFF6B7280),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  job.locationAddress,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 11,
                    height: 1.35,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF6B7280),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTrackButton(Job job) {
    return SizedBox(
      width: double.infinity,
      height: 48,
      child: ElevatedButton(
        onPressed: () {
          Navigator.pushNamed(
            context,
            '/job-tracking',
            arguments: job.id,
          );
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
        child: const Text(
          'Track Live',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }

  String _shortId(String id) {
    if (id.length <= 8) return id.toUpperCase();
    return id.substring(0, 8).toUpperCase();
  }
}