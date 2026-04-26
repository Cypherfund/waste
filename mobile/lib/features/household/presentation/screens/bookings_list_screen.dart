import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../../../config/app_theme.dart';
import '../../../../models/job.dart';
import '../../../../providers/job_provider.dart';
import '../../../../widgets/bottom_navigation.dart';

class BookingsListScreen extends StatefulWidget {
  const BookingsListScreen({super.key});

  @override
  State<BookingsListScreen> createState() => _BookingsListScreenState();
}

class _BookingsListScreenState extends State<BookingsListScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();

    _tabController = TabController(length: 2, vsync: this);

    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _loadBookingsFromLocal();
      await _loadBookings();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadBookings() async {
    final jobProvider = context.read<JobProvider>();
    await jobProvider.loadMyJobs();
  }

  Future<void> _loadBookingsFromLocal() async {
    final jobProvider = context.read<JobProvider>();
    await jobProvider.loadJobsFromLocal();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      bottomNavigationBar: const BottomNavigation(currentIndex: 1),
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
          'My Bookings',
          style: TextStyle(
            color: Color(0xFF111827),
            fontSize: 14,
            fontWeight: FontWeight.w800,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(
              Icons.more_vert_rounded,
              color: Color(0xFF111827),
              size: 20,
            ),
            onPressed: () {},
          ),
        ],
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

            Container(
              color: Colors.white,
              child: TabBar(
                controller: _tabController,
                indicatorColor: AppColors.primary,
                indicatorWeight: 2,
                labelColor: AppColors.primary,
                unselectedLabelColor: const Color(0xFF6B7280),
                labelStyle: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
                unselectedLabelStyle: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
                tabs: const [
                  Tab(text: 'Upcoming'),
                  Tab(text: 'History'),
                ],
              ),
            ),

            Expanded(
              child: Consumer<JobProvider>(
                builder: (context, jobProvider, _) {
                  if (jobProvider.isLoading) {
                    return Center(
                      child: CircularProgressIndicator(
                        color: AppColors.primary,
                      ),
                    );
                  }

                  return TabBarView(
                    controller: _tabController,
                    children: [
                      _buildJobsList(
                        jobProvider.upcomingJobs,
                        isUpcoming: true,
                      ),
                      _buildJobsList(
                        jobProvider.completedJobs,
                        isUpcoming: false,
                      ),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildJobsList(
      List<Job> jobs, {
        required bool isUpcoming,
      }) {
    if (jobs.isEmpty) {
      return _buildEmptyState(isUpcoming);
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: _loadBookings,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        itemCount: jobs.length,
        itemBuilder: (context, index) {
          return _buildBookingCard(
            jobs[index],
            isUpcoming: isUpcoming,
          );
        },
      ),
    );
  }

  Widget _buildBookingCard(
      Job job, {
        required bool isUpcoming,
      }) {
    final date = DateTime.tryParse(job.scheduledDate);
    final statusColor = _getStatusColor(job.status);
    final statusText = _getStatusText(job.status);

    return GestureDetector(
      onTap: () {
        _openBooking(job, isUpcoming: isUpcoming);
      },
      child: Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.fromLTRB(16, 15, 16, 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(11),
          border: Border.all(color: const Color(0xFFE5E7EB)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.025),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    date == null
                        ? job.scheduledDate
                        : DateFormat('EEE, d MMM yyyy').format(date),
                    style: const TextStyle(
                      fontSize: 13,
                      height: 1.25,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF111827),
                    ),
                  ),

                  const SizedBox(height: 4),

                  Text(
                    job.scheduledTime,
                    style: const TextStyle(
                      fontSize: 13,
                      height: 1.25,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF111827),
                    ),
                  ),

                  const SizedBox(height: 10),

                  Row(
                    children: [
                      const Icon(
                        Icons.location_on_outlined,
                        size: 16,
                        color: Color(0xFF9CA3AF),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          job.locationAddress,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF6B7280),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(width: 12),

            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 9,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.11),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    statusText,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: statusColor,
                    ),
                  ),
                ),

                const SizedBox(height: 30),

                GestureDetector(
                  onTap: () {
                    _openBooking(job, isUpcoming: isUpcoming);
                  },
                  child: Text(
                    'View',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(bool isUpcoming) {
    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: _loadBookings,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 80, 20, 24),
        children: [
          Icon(
            isUpcoming ? Icons.event_busy_outlined : Icons.history_rounded,
            size: 68,
            color: const Color(0xFFD1D5DB),
          ),
          const SizedBox(height: 20),
          Text(
            isUpcoming ? 'No upcoming bookings' : 'No booking history',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w900,
              color: Color(0xFF111827),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            isUpcoming
                ? 'Schedule a pickup to get started.'
                : 'Completed bookings will appear here.',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              height: 1.4,
              fontWeight: FontWeight.w500,
              color: Color(0xFF6B7280),
            ),
          ),
          if (isUpcoming) ...[
            const SizedBox(height: 22),
            SizedBox(
              height: 48,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pushNamed(context, '/schedule-pickup');
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(9),
                  ),
                ),
                child: const Text(
                  'Schedule Pickup',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _openBooking(
      Job job, {
        required bool isUpcoming,
      }) {
    print('Opening booking ${job.id} - Status: ${job.status} - Upcoming: $isUpcoming');
    if (isUpcoming &&
        (job.status == JobStatus.requested ||
            job.status == JobStatus.assigned ||
            job.status == JobStatus.inProgress)) {
      Navigator.pushNamed(
        context,
        '/job-tracking',
        arguments: job.id,
      );
    } else {
      Navigator.pushNamed(
        context,
        '/booking-details',
        arguments: job.id,
      );
    }
  }

  Color _getStatusColor(JobStatus status) {
    switch (status) {
      case JobStatus.requested:
        return const Color(0xFFF97316);
      case JobStatus.assigned:
        return const Color(0xFFF97316);
      case JobStatus.inProgress:
        return const Color(0xFF2563EB);
      case JobStatus.completed:
        return AppColors.primary;
      case JobStatus.validated:
        return AppColors.primary;
      case JobStatus.rated:
        return AppColors.primary;
      case JobStatus.cancelled:
        return const Color(0xFFDC2626);
      case JobStatus.disputed:
        return const Color(0xFFDC2626);
    }
  }

  String _getStatusText(JobStatus status) {
    switch (status) {
      case JobStatus.requested:
        return 'Assigned';
      case JobStatus.assigned:
        return 'Assigned';
      case JobStatus.inProgress:
        return 'On the way';
      case JobStatus.completed:
        return 'Completed';
      case JobStatus.validated:
        return 'Completed';
      case JobStatus.rated:
        return 'Completed';
      case JobStatus.cancelled:
        return 'Cancelled';
      case JobStatus.disputed:
        return 'Issue';
    }
  }
}