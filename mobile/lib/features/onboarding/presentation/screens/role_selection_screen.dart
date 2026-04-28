import 'package:flutter/material.dart';
import '../../../../config/app_theme.dart';
import '../../onboarding_flow.dart';

class RoleSelectionScreen extends StatefulWidget {
  final UserRole? selectedRole;
  final ValueChanged<UserRole> onRoleSelected;
  final VoidCallback onContinue;
  final VoidCallback onBack;

  const RoleSelectionScreen({
    super.key,
    this.selectedRole,
    required this.onRoleSelected,
    required this.onContinue,
    required this.onBack,
  });

  @override
  State<RoleSelectionScreen> createState() => _RoleSelectionScreenState();
}

class _RoleSelectionScreenState extends State<RoleSelectionScreen> {
  UserRole? selected;

  @override
  void initState() {
    super.initState();
    selected = widget.selectedRole;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7F4),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: IntrinsicHeight(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 10),

                      // BACK BUTTON
                      IconButton(
                        onPressed: widget.onBack,
                        icon: const Icon(Icons.arrow_back_ios_new, size: 20),
                      ),

                      const SizedBox(height: 10),

                      // TITLE
                      const Text(
                        'I want to join as',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                        ),
                      ),

                      const SizedBox(height: 6),

                      Text(
                        'Choose your role',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade600,
                        ),
                      ),

                      const SizedBox(height: 20),

                      // CARDS
                      _roleCard(
                        role: UserRole.collector,
                        title: 'Collector',
                        subtitle:
                            'Collect waste, earn money\nand support your community.',
                        image: 'assets/images/onboarding/collector.png',
                      ),

                      _roleCard(
                        role: UserRole.household,
                        title: 'Household',
                        subtitle:
                            'Schedule waste collection\nand keep your area clean.',
                        image: 'assets/images/onboarding/household.png',
                      ),

                      const Spacer(),

                      // CONTINUE BUTTON
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: selected != null ? widget.onContinue : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            disabledBackgroundColor: Colors.grey.shade300,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: Text(
                            'Continue',
                            style: TextStyle(
                              fontSize: 16,
                              color: selected != null
                                  ? Colors.white
                                  : Colors.grey.shade500,
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  // 🔥 FINAL ROLE CARD (IMAGE-DRIVEN DESIGN)
  Widget _roleCard({
    required UserRole role,
    required String title,
    required String subtitle,
    required String image,
  }) {
    final isSelected = selected == role;

    return GestureDetector(
      onTap: () {
        setState(() => selected = role);
        widget.onRoleSelected(role);
      },
      child: Container(
        width: double.infinity,
        height: 260, // 🔥 controlled height
        margin: const EdgeInsets.only(bottom: 18),
        clipBehavior: Clip.hardEdge,
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFFF7F2E7)
              : Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: isSelected
                ? const Color(0xFFE6A94B)
                : Colors.grey.shade300,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Stack(
          children: [
            // 🔥 TEXT BLOCK (TOP LEFT)
            Positioned(
              top: 16,
              left: 18,
              right: 120, // 🔥 reserves space for image
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.4,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),

            // 🔥 IMAGE (OVERLAPPING UPWARD)
            Positioned(
              right: -10,
              bottom: -10,
              child: Image.asset(
                image,
                height: 180,
                fit: BoxFit.contain,
              ),
            ),

            // 🔥 CHECK ICON
            Positioned(
              top: 12,
              right: 12,
              child: Container(
                width: 26,
                height: 26,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isSelected
                      ? AppColors.primary
                      : Colors.transparent,
                  border: Border.all(
                    color: isSelected
                        ? AppColors.primary
                        : Colors.grey.shade400,
                    width: 2,
                  ),
                ),
                child: isSelected
                    ? const Icon(Icons.check,
                    size: 16, color: Colors.white)
                    : null,
              ),
            ),
          ],
        ),
      ),
    );
  }
}