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
  DateTime _focusedMonth = DateTime.now();
  String? _selectedTimeSlot;

  late final DateTime _minDate;
  late final DateTime _maxDate;

  final List<TimeSlot> _timeSlots = const [
    TimeSlot(time: '6:00 AM – 8:00 AM', isAvailable: true),
    TimeSlot(time: '8:00 AM – 10:00 AM', isAvailable: true),
    TimeSlot(time: '10:00 AM – 12:00 PM', isAvailable: true),
    TimeSlot(time: '2:00 PM – 4:00 PM', isAvailable: true),
    TimeSlot(time: '4:00 PM – 6:00 PM', isAvailable: true),
  ];

  @override
  void initState() {
    super.initState();

    final now = DateTime.now();
    _minDate = DateTime(now.year, now.month, now.day);
    _maxDate = _minDate.add(const Duration(days: 30));

    _selectedDate = _firstAvailableDate(_minDate);
    _focusedMonth = DateTime(_selectedDate.year, _selectedDate.month);
    _selectedTimeSlot = '8:00 AM – 10:00 AM';
  }

  DateTime _firstAvailableDate(DateTime from) {
    var date = from;

    while (_isWeekend(date)) {
      date = date.add(const Duration(days: 1));
    }

    return date;
  }

  @override
  Widget build(BuildContext context) {
    final canContinue = _selectedTimeSlot != null;

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
                      'Select a date',
                      style: TextStyle(
                        fontSize: 13,
                        color: Color(0xFF111827),
                        fontWeight: FontWeight.w800,
                      ),
                    ),

                    const SizedBox(height: 16),

                    _buildCalendar(),

                    const SizedBox(height: 22),

                    const Text(
                      'Select a time slot',
                      style: TextStyle(
                        fontSize: 13,
                        color: Color(0xFF111827),
                        fontWeight: FontWeight.w800,
                      ),
                    ),

                    const SizedBox(height: 12),

                    ..._timeSlots.map(_buildTimeSlotButton),

                    const SizedBox(height: 18),

                    Row(
                      children: const [
                        Icon(
                          Icons.info_outline_rounded,
                          size: 14,
                          color: Color(0xFF6B7280),
                        ),
                        SizedBox(width: 6),
                        Text(
                          'Earliest available: Tomorrow',
                          style: TextStyle(
                            fontSize: 11,
                            color: Color(0xFF6B7280),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
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

  Widget _buildCalendar() {
    return Column(
      children: [
        Row(
          children: [
            GestureDetector(
              onTap: _canGoToPreviousMonth() ? () => _changeMonth(-1) : null,
              child: Icon(
                Icons.chevron_left_rounded,
                size: 22,
                color: _canGoToPreviousMonth()
                    ? const Color(0xFF374151)
                    : const Color(0xFFD1D5DB),
              ),
            ),

            Expanded(
              child: Center(
                child: Text(
                  DateFormat('MMMM yyyy').format(_focusedMonth),
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF111827),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),

            GestureDetector(
              onTap: _canGoToNextMonth() ? () => _changeMonth(1) : null,
              child: Icon(
                Icons.chevron_right_rounded,
                size: 22,
                color: _canGoToNextMonth()
                    ? const Color(0xFF374151)
                    : const Color(0xFFD1D5DB),
              ),
            ),
          ],
        ),

        const SizedBox(height: 18),

        Row(
          children: const [
            _WeekdayLabel('Mo'),
            _WeekdayLabel('Tu'),
            _WeekdayLabel('We'),
            _WeekdayLabel('Th'),
            _WeekdayLabel('Fr'),
            _WeekdayLabel('Sa'),
            _WeekdayLabel('Su'),
          ],
        ),

        const SizedBox(height: 10),

        _buildCalendarGrid(),
      ],
    );
  }

  Widget _buildCalendarGrid() {
    final firstDay = DateTime(_focusedMonth.year, _focusedMonth.month, 1);
    final lastDay = DateTime(_focusedMonth.year, _focusedMonth.month + 1, 0);

    final leadingEmptyDays = firstDay.weekday - 1;

    final List<Widget> cells = [];

    for (int i = 0; i < leadingEmptyDays; i++) {
      cells.add(const SizedBox(height: 34));
    }

    for (int day = 1; day <= lastDay.day; day++) {
      final date = DateTime(_focusedMonth.year, _focusedMonth.month, day);
      cells.add(_buildDayCell(date));
    }

    while (cells.length % 7 != 0) {
      cells.add(const SizedBox(height: 34));
    }

    return GridView.builder(
      itemCount: cells.length,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: EdgeInsets.zero,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 7,
        mainAxisExtent: 36,
        crossAxisSpacing: 6,
        mainAxisSpacing: 4,
      ),
      itemBuilder: (_, index) => cells[index],
    );
  }

  Widget _buildDayCell(DateTime date) {
    final isSelected = _isSameDay(date, _selectedDate);
    final isPast = date.isBefore(_minDate);
    final isOutsideRange = date.isAfter(_maxDate);
    final disabled = isPast || isOutsideRange;

    return GestureDetector(
      onTap: disabled
          ? null
          : () {
        setState(() {
          _selectedDate = date;
          _selectedTimeSlot = null;
        });
      },
      child: Center(
        child: Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : Colors.transparent,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              '${date.day}',
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                color: disabled
                    ? const Color(0xFFC8CDD2)
                    : isSelected
                    ? Colors.white
                    : const Color(0xFF374151),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTimeSlotButton(TimeSlot slot) {
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
        width: double.infinity,
        height: 36,
        margin: const EdgeInsets.only(bottom: 9),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? AppColors.primary : const Color(0xFFE5E7EB),
            width: isSelected ? 1.4 : 1,
          ),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Text(
              slot.time,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                color: slot.isAvailable
                    ? const Color(0xFF374151)
                    : const Color(0xFFB8B8B8),
              ),
            ),
            if (isSelected)
              Positioned(
                right: 10,
                child: Container(
                  width: 16,
                  height: 16,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_rounded,
                    size: 11,
                    color: Colors.white,
                  ),
                ),
              ),
            if (isSelected)
              Positioned(
                left: 10,
                child: Icon(
                  Icons.access_time_rounded,
                  size: 14,
                  color: AppColors.primary,
                ),
              ),
          ],
        ),
      ),
    );
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  bool _isWeekend(DateTime date) {
    return date.weekday == DateTime.saturday ||
        date.weekday == DateTime.sunday;
  }

  bool _canGoToPreviousMonth() {
    final currentMonth = DateTime(_focusedMonth.year, _focusedMonth.month);
    final minMonth = DateTime(_minDate.year, _minDate.month);
    return currentMonth.isAfter(minMonth);
  }

  bool _canGoToNextMonth() {
    final currentMonth = DateTime(_focusedMonth.year, _focusedMonth.month);
    final maxMonth = DateTime(_maxDate.year, _maxDate.month);
    return currentMonth.isBefore(maxMonth);
  }

  void _changeMonth(int delta) {
    setState(() {
      _focusedMonth = DateTime(
        _focusedMonth.year,
        _focusedMonth.month + delta,
      );

      var nextDate = DateTime(_focusedMonth.year, _focusedMonth.month, 1);

      if (nextDate.isBefore(_minDate)) {
        nextDate = _minDate;
      }

      if (nextDate.isAfter(_maxDate)) {
        nextDate = _maxDate;
      }

      _selectedDate = nextDate;
      _selectedTimeSlot = null;
    });
  }
}

class _WeekdayLabel extends StatelessWidget {
  final String label;

  const _WeekdayLabel(this.label);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Center(
        child: Text(
          label,
          style: const TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w600,
            color: Color(0xFF6B7280),
          ),
        ),
      ),
    );
  }
}