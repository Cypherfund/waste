import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../config/app_theme.dart';

class TimeSlot {
  final String time;
  final bool isAvailable;

  const TimeSlot({
    required this.time,
    required this.isAvailable,
  });
}

class ScheduleDateTimeScreen extends StatefulWidget {
  final dynamic pickupType;

  const ScheduleDateTimeScreen({
    super.key,
    this.pickupType,
  });

  @override
  State<ScheduleDateTimeScreen> createState() => _ScheduleDateTimeScreenState();
}

class _ScheduleDateTimeScreenState extends State<ScheduleDateTimeScreen> {
  DateTime _selectedDate = DateTime.now();
  String? _selectedTimeSlot;
  final DateTime _minDate = DateTime.now();
  final DateTime _maxDate = DateTime.now().add(const Duration(days: 30));

  // Simulate time slots - in production, these would come from API
  final List<TimeSlot> _morningSlots = [
    const TimeSlot(time: '06:00 - 08:00', isAvailable: true),
    const TimeSlot(time: '08:00 - 10:00', isAvailable: true),
    const TimeSlot(time: '10:00 - 12:00', isAvailable: false),
  ];

  final List<TimeSlot> _afternoonSlots = [
    const TimeSlot(time: '12:00 - 14:00', isAvailable: true),
    const TimeSlot(time: '14:00 - 16:00', isAvailable: true),
    const TimeSlot(time: '16:00 - 18:00', isAvailable: true),
  ];

  @override
  void initState() {
    super.initState();
    // Skip weekends if today is weekend
    while (_selectedDate.weekday == DateTime.saturday ||
           _selectedDate.weekday == DateTime.sunday) {
      _selectedDate = _selectedDate.add(const Duration(days: 1));
    }
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
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Choose date and time',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Select when you want your waste collected',
                          style: TextStyle(
                            fontSize: 16,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Calendar Section
                  _buildCalendarSection(),

                  // Time Slots Section
                  if (!_isWeekend(_selectedDate)) _buildTimeSlotsSection(),
                  
                  if (_isWeekend(_selectedDate)) _buildWeekendMessage(),

                  const SizedBox(height: 100),
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
          _buildProgressStep(2, 'Schedule', true, false),
          _buildProgressLine(false),
          _buildProgressStep(3, 'Location', false, false),
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

  Widget _buildCalendarSection() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Month/Year Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                DateFormat('MMMM yyyy').format(_selectedDate),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              Row(
                children: [
                  IconButton(
                    icon: Icon(Icons.chevron_left, color: AppColors.primary),
                    onPressed: _canGoToPreviousMonth()
                        ? () => _changeMonth(-1)
                        : null,
                  ),
                  IconButton(
                    icon: Icon(Icons.chevron_right, color: AppColors.primary),
                    onPressed: _canGoToNextMonth()
                        ? () => _changeMonth(1)
                        : null,
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Weekday Labels
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: ['S', 'M', 'T', 'W', 'T', 'F', 'S']
                .map((day) => SizedBox(
                      width: 40,
                      child: Center(
                        child: Text(
                          day,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ),
                    ))
                .toList(),
          ),
          const SizedBox(height: 8),

          // Calendar Grid
          _buildCalendarGrid(),
        ],
      ),
    );
  }

  Widget _buildCalendarGrid() {
    final firstDayOfMonth = DateTime(_selectedDate.year, _selectedDate.month, 1);
    final lastDayOfMonth = DateTime(_selectedDate.year, _selectedDate.month + 1, 0);
    final startingWeekday = firstDayOfMonth.weekday % 7;
    
    List<Widget> dayWidgets = [];
    
    // Add empty spaces for days before month starts
    for (int i = 0; i < startingWeekday; i++) {
      dayWidgets.add(const SizedBox(width: 40, height: 40));
    }
    
    // Add days of the month
    for (int day = 1; day <= lastDayOfMonth.day; day++) {
      final date = DateTime(_selectedDate.year, _selectedDate.month, day);
      dayWidgets.add(_buildDayWidget(date));
    }
    
    // Create rows of 7 days
    List<Widget> rows = [];
    for (int i = 0; i < dayWidgets.length; i += 7) {
      rows.add(
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: dayWidgets.skip(i).take(7).toList(),
          ),
        ),
      );
    }
    
    return Column(children: rows);
  }

  Widget _buildDayWidget(DateTime date) {
    final isSelected = _isSameDay(date, _selectedDate);
    final isToday = _isSameDay(date, DateTime.now());
    final isPast = date.isBefore(DateTime.now().subtract(const Duration(days: 1)));
    final isWeekend = date.weekday == DateTime.saturday || date.weekday == DateTime.sunday;
    final isDisabled = isPast || isWeekend;
    
    return GestureDetector(
      onTap: isDisabled
          ? null
          : () {
              setState(() {
                _selectedDate = date;
                _selectedTimeSlot = null; // Reset time selection
              });
            },
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary
              : isToday
                  ? AppColors.primaryLight.withOpacity(0.2)
                  : Colors.transparent,
          shape: BoxShape.circle,
          border: isToday && !isSelected
              ? Border.all(color: AppColors.primary, width: 2)
              : null,
        ),
        child: Center(
          child: Text(
            date.day.toString(),
            style: TextStyle(
              fontSize: 14,
              fontWeight: isSelected || isToday ? FontWeight.w600 : FontWeight.normal,
              color: isDisabled
                  ? Colors.grey.shade400
                  : isSelected
                      ? Colors.white
                      : Colors.black87,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTimeSlotsSection() {
    return Container(
      margin: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.access_time, color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              const Text(
                'Available time slots',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          
          // Morning Slots
          _buildTimeSlotGroup('Morning', _morningSlots),
          const SizedBox(height: 20),
          
          // Afternoon Slots
          _buildTimeSlotGroup('Afternoon', _afternoonSlots),
        ],
      ),
    );
  }

  Widget _buildTimeSlotGroup(String title, List<TimeSlot> slots) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.grey.shade700,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: slots.map((slot) => _buildTimeSlotChip(slot)).toList(),
        ),
      ],
    );
  }

  Widget _buildTimeSlotChip(TimeSlot slot) {
    final isSelected = _selectedTimeSlot == slot.time;
    
    return GestureDetector(
      onTap: slot.isAvailable
          ? () {
              setState(() {
                _selectedTimeSlot = slot.time;
              });
            }
          : null,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        decoration: BoxDecoration(
          color: !slot.isAvailable
              ? Colors.grey.shade100
              : isSelected
                  ? AppColors.primary
                  : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: !slot.isAvailable
                ? Colors.grey.shade300
                : isSelected
                    ? AppColors.primary
                    : Colors.grey.shade300,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Text(
          slot.time,
          style: TextStyle(
            fontSize: 14,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
            color: !slot.isAvailable
                ? Colors.grey.shade400
                : isSelected
                    ? Colors.white
                    : Colors.black87,
          ),
        ),
      ),
    );
  }

  Widget _buildWeekendMessage() {
    return Container(
      margin: const EdgeInsets.all(20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.orange.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.orange.shade200),
      ),
      child: Row(
        children: [
          Icon(
            Icons.info_outline,
            color: Colors.orange.shade700,
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Pickup service is not available on weekends. Please select a weekday.',
              style: TextStyle(
                fontSize: 14,
                color: Colors.orange.shade800,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContinueButton() {
    final canContinue = _selectedTimeSlot != null && !_isWeekend(_selectedDate);
    
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
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
                    Navigator.pushNamed(
                      context,
                      '/schedule-location',
                      arguments: {
                        'pickupType': widget.pickupType,
                        'scheduledDate': _selectedDate,
                        'scheduledTime': _selectedTimeSlot,
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

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  bool _isWeekend(DateTime date) {
    return date.weekday == DateTime.saturday || date.weekday == DateTime.sunday;
  }

  bool _canGoToPreviousMonth() {
    final firstDayOfCurrentMonth = DateTime(_selectedDate.year, _selectedDate.month, 1);
    final firstDayOfMinMonth = DateTime(_minDate.year, _minDate.month, 1);
    return firstDayOfCurrentMonth.isAfter(firstDayOfMinMonth);
  }

  bool _canGoToNextMonth() {
    final lastDayOfCurrentMonth = DateTime(_selectedDate.year, _selectedDate.month + 1, 0);
    return lastDayOfCurrentMonth.isBefore(_maxDate);
  }

  void _changeMonth(int delta) {
    setState(() {
      _selectedDate = DateTime(_selectedDate.year, _selectedDate.month + delta, 1);
      _selectedTimeSlot = null;
    });
  }
}
