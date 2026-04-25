import 'package:flutter/material.dart';
import '../../../../config/app_theme.dart';

enum PickupType {
  regular,
  recyclable,
  hazardous,
  bulk,
}

class PickupTypeData {
  final PickupType type;
  final String title;
  final String description;
  final IconData icon;
  final Color color;

  const PickupTypeData({
    required this.type,
    required this.title,
    required this.description,
    required this.icon,
    required this.color,
  });
}

class SchedulePickupTypeScreen extends StatefulWidget {
  const SchedulePickupTypeScreen({super.key});

  @override
  State<SchedulePickupTypeScreen> createState() => _SchedulePickupTypeScreenState();
}

class _SchedulePickupTypeScreenState extends State<SchedulePickupTypeScreen> {
  PickupType? _selectedType;

  final List<PickupTypeData> _pickupTypes = [
    PickupTypeData(
      type: PickupType.regular,
      title: 'Regular Waste',
      description: 'Household waste, food scraps, and general refuse',
      icon: Icons.delete_outline,
      color: AppColors.primary,
    ),
    PickupTypeData(
      type: PickupType.recyclable,
      title: 'Recyclable',
      description: 'Plastic, paper, glass, and metal items',
      icon: Icons.recycling,
      color: Colors.blue,
    ),
    PickupTypeData(
      type: PickupType.hazardous,
      title: 'Hazardous',
      description: 'Batteries, chemicals, medical waste',
      icon: Icons.warning_amber_rounded,
      color: Colors.orange,
    ),
    PickupTypeData(
      type: PickupType.bulk,
      title: 'Bulk Items',
      description: 'Furniture, appliances, construction debris',
      icon: Icons.king_bed_outlined,
      color: Colors.purple,
    ),
  ];

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
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'What type of pickup do you need?',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Select the type of waste you want to dispose of',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.grey.shade600,
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // Pickup Type Options
                  ..._pickupTypes.map((type) => _buildPickupTypeCard(type)),
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
      child: Column(
        children: [
          Row(
            children: [
              _buildProgressStep(1, 'Type', true, true),
              _buildProgressLine(false),
              _buildProgressStep(2, 'Schedule', false, false),
              _buildProgressLine(false),
              _buildProgressStep(3, 'Location', false, false),
              _buildProgressLine(false),
              _buildProgressStep(4, 'Review', false, false),
            ],
          ),
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

  Widget _buildPickupTypeCard(PickupTypeData type) {
    final isSelected = _selectedType == type.type;
    
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedType = type.type;
        });
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? type.color : Colors.grey.shade200,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: [
            if (isSelected)
              BoxShadow(
                color: type.color.withOpacity(0.2),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: type.color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  type.icon,
                  color: type.color,
                  size: 28,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      type.title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      type.description,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade600,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
              if (isSelected)
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: type.color,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check,
                    color: Colors.white,
                    size: 16,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContinueButton() {
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
              backgroundColor: _selectedType != null
                  ? AppColors.primary
                  : Colors.grey.shade300,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              elevation: 0,
            ),
            onPressed: _selectedType != null
                ? () {
                    // Navigate to next screen with selected type
                    Navigator.pushNamed(
                      context,
                      '/schedule-date-time',
                      arguments: {
                        'pickupType': _selectedType,
                      },
                    );
                  }
                : null,
            child: Text(
              'Continue',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: _selectedType != null ? Colors.white : Colors.grey.shade600,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
