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
  String _selectedFilter = 'all';
  
  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    // Defer loading bookings to avoid setState during build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadBookings();
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
  
  List<Job> _filterJobs(List<Job> jobs, String filter) {
    switch (filter) {
      case 'today':
        final today = DateTime.now();
        return jobs.where((job) {
          final date = DateTime.parse(job.scheduledDate);
          return date.year == today.year &&
                 date.month == today.month &&
                 date.day == today.day;
        }).toList();
      case 'week':
        final startOfWeek = DateTime.now().subtract(Duration(days: DateTime.now().weekday - 1));
        final endOfWeek = startOfWeek.add(const Duration(days: 7));
        return jobs.where((job) {
          final date = DateTime.parse(job.scheduledDate);
          return date.isAfter(startOfWeek.subtract(const Duration(days: 1))) &&
                 date.isBefore(endOfWeek);
        }).toList();
      case 'month':
        final now = DateTime.now();
        return jobs.where((job) {
          final date = DateTime.parse(job.scheduledDate);
          return date.year == now.year && date.month == now.month;
        }).toList();
      default:
        return jobs;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7F4),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'My Bookings',
          style: TextStyle(
            color: Colors.black,
            fontSize: 20,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(120),
          child: Column(
            children: [
              // Filter Chips
              _buildFilterChips(),
              // Tab Bar
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border(
                    bottom: BorderSide(color: Colors.grey.shade200),
                  ),
                ),
                child: TabBar(
                  controller: _tabController,
                  labelColor: AppColors.primary,
                  unselectedLabelColor: Colors.grey.shade600,
                  indicatorColor: AppColors.primary,
                  indicatorWeight: 3,
                  tabs: const [
                    Tab(text: 'Upcoming'),
                    Tab(text: 'Past'),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      body: Consumer<JobProvider>(
        builder: (context, jobProvider, _) {
          if (jobProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          
          return TabBarView(
            controller: _tabController,
            children: [
              // Upcoming Tab
              _buildJobsList(
                _filterJobs(jobProvider.upcomingJobs, _selectedFilter),
                isUpcoming: true,
              ),
              // Past Tab
              _buildJobsList(
                _filterJobs(jobProvider.completedJobs, _selectedFilter),
                isUpcoming: false,
              ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        onPressed: () {
          Navigator.pushNamed(context, '/schedule-pickup');
        },
        icon: const Icon(Icons.add),
        label: const Text(
          'New Booking',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      bottomNavigationBar: const BottomNavigation(currentIndex: 1),
    );
  }
  
  Widget _buildFilterChips() {
    return Container(
      height: 60,
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        children: [
          _buildFilterChip('All', 'all'),
          const SizedBox(width: 8),
          _buildFilterChip('Today', 'today'),
          const SizedBox(width: 8),
          _buildFilterChip('This Week', 'week'),
          const SizedBox(width: 8),
          _buildFilterChip('This Month', 'month'),
        ],
      ),
    );
  }
  
  Widget _buildFilterChip(String label, String value) {
    final isSelected = _selectedFilter == value;
    
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        setState(() {
          _selectedFilter = value;
        });
      },
      selectedColor: AppColors.primary,
      checkmarkColor: Colors.white,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : Colors.grey.shade700,
        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
      ),
      backgroundColor: Colors.grey.shade100,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(
          color: isSelected ? AppColors.primary : Colors.grey.shade300,
        ),
      ),
    );
  }
  
  Widget _buildJobsList(List<Job> jobs, {required bool isUpcoming}) {
    if (jobs.isEmpty) {
      return _buildEmptyState(isUpcoming);
    }
    
    return RefreshIndicator(
      onRefresh: _loadBookings,
      child: ListView.builder(
        padding: const EdgeInsets.all(20),
        itemCount: jobs.length,
        itemBuilder: (context, index) {
          final job = jobs[index];
          return _buildJobCard(job, isUpcoming: isUpcoming);
        },
      ),
    );
  }
  
  Widget _buildEmptyState(bool isUpcoming) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image.asset(
              'assets/images/empty_states/no-booking-yet.png',
              width: 150,
              height: 150,
              errorBuilder: (_, __, ___) => Icon(
                isUpcoming ? Icons.event_busy : Icons.history,
                size: 100,
                color: Colors.grey.shade300,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              isUpcoming
                  ? 'No upcoming bookings'
                  : 'No past bookings',
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              isUpcoming
                  ? 'Schedule a pickup to get started'
                  : 'Your completed bookings will appear here',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey.shade600,
              ),
              textAlign: TextAlign.center,
            ),
            if (isUpcoming) ...[
              const SizedBox(height: 24),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: () {
                  Navigator.pushNamed(context, '/schedule-pickup');
                },
                icon: const Icon(Icons.add),
                label: const Text(
                  'Schedule Pickup',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
  
  Widget _buildJobCard(Job job, {required bool isUpcoming}) {
    return GestureDetector(
      onTap: () {
        if (isUpcoming && 
            (job.status == JobStatus.inProgress || 
             job.status == JobStatus.assigned ||
             job.status == JobStatus.requested)) {
          // Navigate to tracking screen
          Navigator.pushNamed(
            context,
            '/job-tracking',
            arguments: job.id,
          );
        } else {
          // Navigate to booking details
          Navigator.pushNamed(
            context,
            '/booking-details',
            arguments: job.id,
          );
        }
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
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
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _getStatusColor(job.status).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: _getStatusColor(job.status),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        _getStatusText(job.status),
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: _getStatusColor(job.status),
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  'ID: ${job.id.substring(0, 8).toUpperCase()}',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade600,
                    fontFamily: 'monospace',
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 16),
            
            // Date & Time
            Row(
              children: [
                Icon(
                  Icons.calendar_today,
                  size: 20,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${DateFormat('EEEE, d MMM').format(DateTime.parse(job.scheduledDate))} • ${job.scheduledTime}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                    ),
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 12),
            
            // Location
            Row(
              children: [
                Icon(
                  Icons.location_on_outlined,
                  size: 20,
                  color: Colors.grey.shade600,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    job.locationAddress,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade700,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            
            // Rating (for completed jobs)
            if (job.status == JobStatus.rated && job.rating != null) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  ...List.generate(5, (index) => Icon(
                    index < job.rating! ? Icons.star : Icons.star_border,
                    size: 16,
                    color: Colors.orange,
                  )),
                  const SizedBox(width: 8),
                  Text(
                    'You rated ${job.rating}/5',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ],
            
            // Action Button
            if (isUpcoming && 
                (job.status == JobStatus.requested || 
                 job.status == JobStatus.assigned ||
                 job.status == JobStatus.inProgress)) ...[
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    elevation: 0,
                  ),
                  onPressed: () {
                    Navigator.pushNamed(
                      context,
                      '/job-tracking',
                      arguments: job.id,
                    );
                  },
                  child: const Text(
                    'Track Pickup',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
  
  Color _getStatusColor(JobStatus status) {
    switch (status) {
      case JobStatus.requested:
        return Colors.orange;
      case JobStatus.assigned:
        return Colors.blue;
      case JobStatus.inProgress:
        return Colors.purple;
      case JobStatus.completed:
        return Colors.green;
      case JobStatus.validated:
        return Colors.green;
      case JobStatus.rated:
        return Colors.green;
      case JobStatus.cancelled:
        return Colors.red;
      case JobStatus.disputed:
        return Colors.red;
    }
  }
  
  String _getStatusText(JobStatus status) {
    switch (status) {
      case JobStatus.requested:
        return 'Finding collector';
      case JobStatus.assigned:
        return 'Collector assigned';
      case JobStatus.inProgress:
        return 'On the way';
      case JobStatus.completed:
        return 'Completed';
      case JobStatus.validated:
        return 'Confirmed';
      case JobStatus.rated:
        return 'Rated';
      case JobStatus.cancelled:
        return 'Cancelled';
      case JobStatus.disputed:
        return 'Disputed';
    }
  }
}
