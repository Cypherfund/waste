import 'package:flutter/material.dart';
import '../../../../config/app_theme.dart';

class WelcomeScreen extends StatelessWidget {
  final VoidCallback onGetStarted;
  final VoidCallback onLogin;

  const WelcomeScreen({
    super.key,
    required this.onGetStarted,
    required this.onLogin,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7F4),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(28),
              child: Container(
                width: double.infinity,
                constraints: const BoxConstraints(maxWidth: 430),
                color: Colors.white,
                child: Stack(
                  children: [
                    // 🔥 Bottom Illustration
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 0,
                      child: Image.asset(
                        'assets/images/onboarding/screen-hysacam.png',
                        fit: BoxFit.fitWidth,
                        alignment: Alignment.bottomCenter,
                      ),
                    ),

                    // 🔥 Content
                    Positioned.fill(
                      child: SingleChildScrollView(
                        physics: const BouncingScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(22, 26, 22, 320),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildHeader(),
                            const SizedBox(height: 34),

                            _buildHeadline(),
                            const SizedBox(height: 18),

                            _buildDescription(),
                            const SizedBox(height: 30),

                            _buildFeatures(),
                          ],
                        ),
                      ),
                    ),

                    // 🔥 CTA fixed at bottom
                    Positioned(
                      left: 20,
                      right: 20,
                      bottom: 20,
                      child: _buildCTA(context),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ---------------- HEADER ----------------
  Widget _buildHeader() {
    return Row(
      children: [
        Image.asset(
          'assets/images/logo.png',
          width: 42,
          height: 42,
          errorBuilder: (_, __, ___) => Icon(
            Icons.recycling,
            color: AppColors.primary,
            size: 42,
          ),
        ),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'KmerTrash',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: AppColors.primary,
                letterSpacing: -0.5,
              ),
            ),
            Text(
              'Clean Today, Green Tomorrow.',
              style: TextStyle(
                fontSize: 11,
                color: Colors.grey.shade500,
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ---------------- HEADLINE ----------------
  Widget _buildHeadline() {
    return RichText(
      text: TextSpan(
        style: const TextStyle(
          fontSize: 28,
          height: 1.25,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.6,
        ),
        children: [
          TextSpan(
            text: 'Your waste.\n',
            style: TextStyle(color: AppColors.primaryDark),
          ),
          TextSpan(
            text: 'Our responsibility.\n',
            style: TextStyle(color: AppColors.primaryDark),
          ),
          TextSpan(
            text: 'A cleaner Douala.',
            style: TextStyle(color: AppColors.primaryLight),
          ),
        ],
      ),
    );
  }

  // ---------------- DESCRIPTION ----------------
  Widget _buildDescription() {
    return Text(
      'Schedule reliable waste pickups in seconds and help keep our community clean.',
      style: TextStyle(
        fontSize: 15,
        height: 1.45,
        color: Colors.grey.shade600,
      ),
    );
  }

  // ---------------- FEATURES ----------------
  Widget _buildFeatures() {
    return Column(
      children: [
        _featureItem(Icons.verified, 'Verified collectors'),
        _featureItem(Icons.camera_alt, 'Photo proof for every pickup'),
        _featureItem(Icons.lock, 'Secure payments'),
        _featureItem(Icons.local_shipping, 'Serving neighborhoods across Douala'),
      ],
    );
  }

  Widget _featureItem(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Row(
        children: [
          Icon(
            icon,
            size: 28, // 🔥 bigger icons
            color: AppColors.primary,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: Colors.black,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ---------------- CTA ----------------
  Widget _buildCTA(BuildContext context) {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
              elevation: 4,
            ),
            onPressed: onGetStarted, // 🔥 PROCEED ACTION
            child: const Text(
              'Get Started',
              style: TextStyle(fontSize: 16, color: Colors.white),
            ),
          ),
        ),
        const SizedBox(height: 10),
        GestureDetector(
          onTap: onLogin,
          child: Text(
            'I already have an account',
            style: TextStyle(
              color: AppColors.primary,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }
}