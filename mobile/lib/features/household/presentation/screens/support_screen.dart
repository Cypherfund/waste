import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../config/app_theme.dart';

class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

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
          'Help & Support',
          style: TextStyle(
            color: Colors.black,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Contact Options
            _buildContactOptions(context),
            
            const SizedBox(height: 32),
            
            // FAQ Section
            _buildFAQSection(),
            
            const SizedBox(height: 32),
            
            // Quick Links
            _buildQuickLinks(context),
          ],
        ),
      ),
    );
  }
  
  Widget _buildContactOptions(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Contact Us',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 16),
        
        Row(
          children: [
            Expanded(
              child: _buildContactCard(
                icon: Icons.phone,
                title: 'Call Us',
                subtitle: '+237 6 70 00 00 00',
                color: AppColors.primary,
                onTap: () => _makePhoneCall('+237670000000'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildContactCard(
                icon: Icons.message,
                title: 'WhatsApp',
                subtitle: '+237 6 70 00 00 00',
                color: Colors.green,
                onTap: () => _openWhatsApp('+237670000000'),
              ),
            ),
          ],
        ),
        
        const SizedBox(height: 12),
        
        _buildContactCard(
          icon: Icons.email,
          title: 'Email',
          subtitle: 'support@hysacam.cm',
          color: Colors.blue,
          onTap: () => _sendEmail('support@hysacam.cm'),
        ),
      ],
    );
  }
  
  Widget _buildContactCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
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
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                color: color,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              color: Colors.grey.shade400,
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildFAQSection() {
    final faqs = [
      {
        'question': 'How do I schedule a pickup?',
        'answer': 'Go to the home screen and tap "Schedule Pickup". Follow the steps to select your waste type, date, time, and location.',
      },
      {
        'question': 'How do I pay for my pickup?',
        'answer': 'Payment is made in cash directly to the collector after the pickup is completed. The amount will be shown in your booking confirmation.',
      },
      {
        'question': 'Can I cancel a pickup?',
        'answer': 'Yes, you can cancel a pickup before a collector is assigned. Go to your bookings and select the pickup you want to cancel.',
      },
      {
        'question': 'What happens if I\'m not available?',
        'answer': 'If you\'re not available when the collector arrives, they will wait for up to 10 minutes. After that, the pickup may be cancelled.',
      },
      {
        'question': 'How do I report an issue?',
        'answer': 'You can report an issue from the booking details screen or by contacting our support team directly.',
      },
    ];
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Frequently Asked Questions',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 16),
        ...faqs.map((faq) => _buildFAQItem(
          question: faq['question'] as String,
          answer: faq['answer'] as String,
        )),
      ],
    );
  }
  
  Widget _buildFAQItem({required String question, required String answer}) {
    return ExpansionTile(
      tilePadding: EdgeInsets.zero,
      childrenPadding: const EdgeInsets.only(bottom: 16, left: 16, right: 16),
      iconColor: AppColors.primary,
      collapsedIconColor: AppColors.primary,
      title: Text(
        question,
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: Colors.black87,
        ),
      ),
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Text(
            answer,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade700,
              height: 1.5,
            ),
          ),
        ),
      ],
    );
  }
  
  Widget _buildQuickLinks(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Quick Links',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 16),
        
        _buildQuickLink(
          icon: Icons.description,
          title: 'Terms of Service',
          onTap: () {
            // Navigate to terms
          },
        ),
        
        _buildQuickLink(
          icon: Icons.privacy_tip,
          title: 'Privacy Policy',
          onTap: () {
            // Navigate to privacy
          },
        ),
        
        _buildQuickLink(
          icon: Icons.info,
          title: 'About Hysacam',
          onTap: () {
            // Show about dialog
          },
        ),
      ],
    );
  }
  
  Widget _buildQuickLink({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(
                  icon,
                  color: Colors.grey.shade700,
                  size: 24,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                      color: Colors.black87,
                    ),
                  ),
                ),
                Icon(
                  Icons.chevron_right,
                  color: Colors.grey.shade400,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
  
  Future<void> _makePhoneCall(String phoneNumber) async {
    final Uri launchUri = Uri(
      scheme: 'tel',
      path: phoneNumber,
    );
    if (await canLaunchUrl(launchUri)) {
      await launchUrl(launchUri);
    }
  }
  
  Future<void> _openWhatsApp(String phoneNumber) async {
    final Uri launchUri = Uri.parse(
      'https://wa.me/$phoneNumber',
    );
    if (await canLaunchUrl(launchUri)) {
      await launchUrl(launchUri, mode: LaunchMode.externalApplication);
    }
  }
  
  Future<void> _sendEmail(String email) async {
    final Uri launchUri = Uri(
      scheme: 'mailto',
      path: email,
    );
    if (await canLaunchUrl(launchUri)) {
      await launchUrl(launchUri);
    }
  }
}
