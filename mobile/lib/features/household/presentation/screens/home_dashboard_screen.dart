import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';

import '../../../../config/app_theme.dart';
import '../../../../providers/auth_provider.dart';
import '../../../../providers/job_provider.dart';
import '../../../../models/job.dart';
import '../../../../widgets/bottom_navigation.dart';

class HomeDashboardScreen extends StatefulWidget {
  const HomeDashboardScreen({super.key});

  @override
  State<HomeDashboardScreen> createState() => _HomeDashboardScreenState();
}

class _HomeDashboardScreenState extends State<HomeDashboardScreen> {
  String _currentAddress = 'Bonapriso, Douala';
  bool _isLoadingLocation = true;

  @override
  void initState() {
    super.initState();

    _getCurrentLocation();

    WidgetsBinding.instance.addPostFrameCallback((_) async {
      // Load from local storage first for immediate display
      await _loadJobsFromLocal();
      // Then refresh from API
      _loadJobs();
    });
  }

  Future<void> _getCurrentLocation() async {
    try {
      var permission = await Geolocator.checkPermission();

      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        if (mounted) {
          setState(() {
            _currentAddress = 'Bonapriso, Douala';
            _isLoadingLocation = false;
          });
        }
        return;
      }

      final position = await Geolocator.getCurrentPosition();
      final placemarks = await placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );

      if (placemarks.isNotEmpty && mounted) {
        final place = placemarks.first;

        final street = place.street?.trim();
        final locality = place.locality?.trim();

        setState(() {
          _currentAddress =
          '${street?.isNotEmpty == true ? street : 'Bonapriso'}, ${locality?.isNotEmpty == true ? locality : 'Douala'}';
          _isLoadingLocation = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _currentAddress = 'Bonapriso, Douala';
          _isLoadingLocation = false;
        });
      }
    }
  }

  Future<void> _loadJobs() async {
    final jobProvider = context.read<JobProvider>();
    await jobProvider.loadMyJobs();
  }

  Future<void> _loadJobsFromLocal() async {
    final jobProvider = context.read<JobProvider>();
    await jobProvider.loadJobsFromLocal();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final jobProvider = context.watch<JobProvider>();
    final upcomingPickups = jobProvider.upcomingJobs;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAF8),
      bottomNavigationBar: const BottomNavigation(currentIndex: 0),
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async {
            await _loadJobs();
            await _getCurrentLocation();
          },
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 10),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: constraints.maxHeight - 28,
                  ),
                  child: IntrinsicHeight(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildDashboardHeader(auth.user?.name ?? 'Sophie'),

                        const SizedBox(height: 20),

                        _buildCleanAreaCard(),

                        const SizedBox(height: 16),

                        upcomingPickups.isNotEmpty
                            ? _buildDashboardNextPickup(upcomingPickups.first)
                            : _buildDashboardEmptyPickup(),

                        const SizedBox(height: 22),

                        _buildDashboardQuickActions(),

                        const Spacer(),

                        _buildScheduleReminderCard(),

                        const SizedBox(height: 8),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildDashboardHeader(String userName) {
    final firstName =
    userName.trim().isEmpty ? 'Sophie' : userName.trim().split(' ').first;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Hello, $firstName 👋',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF111827),
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(
                    Icons.location_on_outlined,
                    size: 15,
                    color: Color(0xFF4B5563),
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      _isLoadingLocation ? 'Bonapriso, Douala' : _currentAddress,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF4B5563),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            border: Border.all(color: const Color(0xFFE5E7EB)),
          ),
          child: const Icon(
            Icons.notifications_none_rounded,
            size: 23,
            color: Color(0xFF111827),
          ),
        ),
      ],
    );
  }

  Widget _buildCleanAreaCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE8EEE8)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.035),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Your area is 80% clean this week 🌱',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF1F2937),
                  ),
                ),
                SizedBox(height: 6),
                Text(
                  "Let's keep it going!",
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF6B7280),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(width: 14),

          SizedBox(
            width: 72,
            height: 44,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CustomPaint(
                  size: const Size(72, 44),
                  painter: _SemiCircleGaugePainter(
                    progress: 0.80,
                    backgroundColor: const Color(0xFFE5E7EB),
                    progressColor: AppColors.primary,
                  ),
                ),
                const Positioned(
                  bottom: 0,
                  child: Text(
                    '80%',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF1F2937),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget  _buildDashboardNextPickup(Job nextPickup) {
    return Container(
      width: double.infinity,
      constraints: const BoxConstraints(
        minHeight: 190,
      ),
      padding: const EdgeInsets.fromLTRB(18, 18, 16, 16),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFAF1),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFF2E3CA)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Next Pickup',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF1F2937),
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFEDD5),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: const Text(
                        'Assigning...',
                        style: TextStyle(
                          fontSize: 12,
                          color: Color(0xFFF97316),
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                const Text(
                  "We're finding a nearby collector",
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF6B7280),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  _formatDate(DateTime.parse(nextPickup.scheduledDate)),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF111827),
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  nextPickup.scheduledTime,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF111827),
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 18),
                GestureDetector(
                  onTap: () {
                    Navigator.pushNamed(
                      context,
                      '/job-tracking',
                      arguments: nextPickup.id,
                    );
                  },
                  child: Text(
                    'View Details',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.primary,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 118,
            height: 118,
            child: Image.asset(
              'assets/images/status/next-pickup.png',
              fit: BoxFit.contain,
              errorBuilder: (_, __, ___) {
                return Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFE7F5E7),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Icon(
                    Icons.electric_moped_rounded,
                    size: 62,
                    color: AppColors.primary,
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDashboardEmptyPickup() {
    return Container(
      width: double.infinity,
      constraints: const BoxConstraints(
        minHeight: 190,
      ),
      padding: const EdgeInsets.fromLTRB(18, 18, 16, 16),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFAF1),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFF2E3CA)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Next Pickup',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF1F2937),
                  ),
                ),
                const SizedBox(height: 18),
                const Text(
                  'No pickup scheduled yet',
                  style: TextStyle(
                    fontSize: 15,
                    color: Color(0xFF111827),
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Schedule your first waste pickup.',
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF6B7280),
                  ),
                ),
                const SizedBox(height: 20),
                GestureDetector(
                  onTap: () => Navigator.pushNamed(context, '/schedule-pickup'),
                  child: Text(
                    'Schedule now',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.primary,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Container(
            width: 118,
            height: 118,
            decoration: BoxDecoration(
              color: const Color(0xFFE7F5E7),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Icon(
              Icons.delete_outline_rounded,
              size: 64,
              color: AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDashboardQuickActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Quick Actions',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: Color(0xFF111827),
          ),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: _quickActionTile(
                icon: Icons.schedule_rounded,
                label: 'Schedule\nPickup',
                selected: true,
                onTap: () => Navigator.pushNamed(context, '/schedule-pickup'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _quickActionTile(
                icon: Icons.event_note_rounded,
                label: 'My\nBookings',
                onTap: () => Navigator.pushNamed(context, '/bookings'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _quickActionTile(
                icon: Icons.account_balance_wallet_outlined,
                label: 'Wallet\n5,600 XAF',
                onTap: () => Navigator.pushNamed(context, '/wallet'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _quickActionTile({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool selected = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        height: 132,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected ? AppColors.primary : const Color(0xFFE5E7EB),
            width: selected ? 1.5 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.035),
              blurRadius: 14,
              offset: const Offset(0, 7),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 27,
              color: selected ? AppColors.primary : const Color(0xFF374151),
            ),
            const SizedBox(height: 16),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                height: 1.25,
                fontSize: 13,
                color: selected ? AppColors.primary : const Color(0xFF111827),
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }


  Widget _buildScheduleReminderCard() {
    return Container(
      width: double.infinity,
      constraints: const BoxConstraints(
        minHeight: 150,
      ),
      padding: const EdgeInsets.fromLTRB(16, 16, 14, 14),
      decoration: BoxDecoration(
        color: const Color(0xFFDFF3DF),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'You usually schedule\nevery 3 days.',
                  style: TextStyle(
                    fontSize: 15,
                    height: 1.35,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF1F2937),
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Schedule now?',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1F2937),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 36,
                  child: ElevatedButton(
                    onPressed: () =>
                        Navigator.pushNamed(context, '/schedule-pickup'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 18),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(9),
                      ),
                    ),
                    child: const Text(
                      'Schedule',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 112,
            height: 112,
            child: Image.asset(
              'assets/images/scheduling/calendar.png',
              fit: BoxFit.contain,
              errorBuilder: (_, __, ___) {
                return Icon(
                  Icons.calendar_month_rounded,
                  size: 86,
                  color: AppColors.primary,
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const weekdays = [
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ];

    return '${weekdays[date.weekday - 1]}, ${date.day} ${months[date.month - 1]} ${date.year}';
  }
}

class _SemiCircleGaugePainter extends CustomPainter {
  final double progress;
  final Color backgroundColor;
  final Color progressColor;

  _SemiCircleGaugePainter({
    required this.progress,
    required this.backgroundColor,
    required this.progressColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    const strokeWidth = 7.0;

    final rect = Rect.fromLTWH(
      strokeWidth / 2,
      strokeWidth / 2,
      size.width - strokeWidth,
      (size.height * 2) - strokeWidth,
    );

    final backgroundPaint = Paint()
      ..color = backgroundColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    final progressPaint = Paint()
      ..color = progressColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      rect,
      3.14159,
      3.14159,
      false,
      backgroundPaint,
    );

    canvas.drawArc(
      rect,
      3.14159,
      3.14159 * progress.clamp(0.0, 1.0),
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _SemiCircleGaugePainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.backgroundColor != backgroundColor ||
        oldDelegate.progressColor != progressColor;
  }
}