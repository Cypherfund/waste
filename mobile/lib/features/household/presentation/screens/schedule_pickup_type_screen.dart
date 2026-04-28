import 'package:flutter/material.dart';
import '../../../../config/app_theme.dart';

enum PickupScheduleType {
  oneTime,
  weekly,
  custom,
}

class PickupScheduleTypeData {
  final PickupScheduleType type;
  final String title;
  final String description;
  final IconData icon;

  const PickupScheduleTypeData({
    required this.type,
    required this.title,
    required this.description,
    required this.icon,
  });
}

class SchedulePickupTypeScreen extends StatefulWidget {
  const SchedulePickupTypeScreen({super.key});

  @override
  State<SchedulePickupTypeScreen> createState() =>
      _SchedulePickupTypeScreenState();
}

class _SchedulePickupTypeScreenState extends State<SchedulePickupTypeScreen> {
  PickupScheduleType _selectedType = PickupScheduleType.oneTime;

  final List<PickupScheduleTypeData> _pickupTypes = const [
    PickupScheduleTypeData(
      type: PickupScheduleType.oneTime,
      title: 'One-time pickup',
      description: 'Schedule a single pickup',
      icon: Icons.restore_from_trash_outlined,
    ),
    PickupScheduleTypeData(
      type: PickupScheduleType.weekly,
      title: 'Weekly pickup',
      description: "We'll come every week",
      icon: Icons.calendar_today_outlined,
    ),
    PickupScheduleTypeData(
      type: PickupScheduleType.custom,
      title: 'Custom schedule',
      description: 'Choose your own repeat days',
      icon: Icons.event_note_outlined,
    ),
  ];

  @override
  Widget build(BuildContext context) {
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
            size: 18,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Schedule Pickup',
          style: TextStyle(
            color: Color(0xFF111827),
            fontSize: 14,
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
                padding: const EdgeInsets.fromLTRB(20, 34, 20, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'What type of pickup\ndo you need?',
                      style: TextStyle(
                        fontSize: 18,
                        height: 1.25,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF111827),
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Choose the option that fits you best.',
                      style: TextStyle(
                        fontSize: 12,
                        color: Color(0xFF6B7280),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 28),

                    ..._pickupTypes.map(_buildPickupTypeCard),
                  ],
                ),
              ),
            ),

            Padding(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
              child: SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  onPressed: () {
                    Navigator.pushNamed(
                      context,
                      '/schedule-date-time',
                      arguments: {
                        'pickupType': _selectedType,
                      },
                    );
                  },
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
          ],
        ),
      ),
    );
  }

  Widget _buildPickupTypeCard(PickupScheduleTypeData item) {
    final isSelected = _selectedType == item.type;

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedType = item.type;
        });
      },
      child: Container(
        width: double.infinity,
        height: 78,
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(11),
          border: Border.all(
            color: isSelected ? AppColors.primary : const Color(0xFFE5E7EB),
            width: isSelected ? 1.4 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.025),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: const Color(0xFFEAF5EA),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                item.icon,
                color: AppColors.primary,
                size: 19,
              ),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF111827),
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    item.description,
                    style: const TextStyle(
                      fontSize: 10,
                      color: Color(0xFF6B7280),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            AnimatedContainer(
              duration: const Duration(milliseconds: 160),
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isSelected ? AppColors.primary : Colors.white,
                border: Border.all(
                  color: isSelected ? AppColors.primary : const Color(0xFFD1D5DB),
                  width: 1.3,
                ),
              ),
              child: isSelected
                  ? const Icon(
                Icons.check_rounded,
                color: Colors.white,
                size: 15,
              )
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}