import 'package:flutter/material.dart';
import '../../../../config/app_theme.dart';
import '../../../../widgets/bottom_navigation.dart';

class WalletScreen extends StatelessWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7F4),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'My Wallet',
          style: TextStyle(
            color: Colors.black,
            fontSize: 20,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.history, color: Colors.black),
            onPressed: () {
              Navigator.pushNamed(context, '/transactions');
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Balance Card
            _buildBalanceCard(),
            
            const SizedBox(height: 24),
            
            // Quick Actions
            _buildQuickActions(context),
            
            const SizedBox(height: 24),
            
            // Recent Transactions
            _buildRecentTransactions(context),
          ],
        ),
      ),
      bottomNavigationBar: const BottomNavigation(currentIndex: 2),
    );
  }
  
  Widget _buildBalanceCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary, AppColors.primaryDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.account_balance_wallet,
                color: Colors.white.withValues(alpha: 0.8),
                size: 24,
              ),
              const SizedBox(width: 8),
              Text(
                'Current Balance',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.white.withValues(alpha: 0.9),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Text(
            '25,000 XAF',
            style: TextStyle(
              fontSize: 36,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '≈ \$41.67 USD',
            style: TextStyle(
              fontSize: 14,
              color: Colors.white.withValues(alpha: 0.8),
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildQuickActions(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Quick Actions',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _buildQuickActionButton(
                icon: Icons.add_circle_outline,
                label: 'Top Up',
                color: AppColors.primary,
                onTap: () {
                  Navigator.pushNamed(context, '/top-up');
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildQuickActionButton(
                icon: Icons.send,
                label: 'Transfer',
                color: Colors.blue,
                onTap: () {
                  // Navigate to transfer
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildQuickActionButton(
                icon: Icons.credit_card,
                label: 'Cards',
                color: Colors.purple,
                onTap: () {
                  Navigator.pushNamed(context, '/payment-methods');
                },
              ),
            ),
          ],
        ),
      ],
    );
  }
  
  Widget _buildQuickActionButton({
    required IconData icon,
    required String label,
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
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                color: color,
                size: 24,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Colors.black87,
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildRecentTransactions(BuildContext context) {
    final transactions = [
      {
        'title': 'Pickup Payment',
        'subtitle': 'Booking #ABC12345',
        'amount': '-2,500 XAF',
        'date': 'Today, 2:30 PM',
        'icon': Icons.delete_outline,
        'isCredit': false,
      },
      {
        'title': 'Top Up',
        'subtitle': 'Mobile Money',
        'amount': '+10,000 XAF',
        'date': 'Yesterday, 10:15 AM',
        'icon': Icons.add_circle_outline,
        'isCredit': true,
      },
      {
        'title': 'Pickup Payment',
        'subtitle': 'Booking #DEF67890',
        'amount': '-2,500 XAF',
        'date': 'Apr 20, 4:45 PM',
        'icon': Icons.delete_outline,
        'isCredit': false,
      },
      {
        'title': 'Top Up',
        'subtitle': 'Bank Transfer',
        'amount': '+20,000 XAF',
        'date': 'Apr 18, 9:00 AM',
        'icon': Icons.add_circle_outline,
        'isCredit': true,
      },
    ];
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Recent Transactions',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
            TextButton(
              onPressed: () {
                Navigator.pushNamed(context, '/transactions');
              },
              child: Text(
                'See All',
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        ...transactions.map((transaction) => _buildTransactionCard(
          title: transaction['title'] as String,
          subtitle: transaction['subtitle'] as String,
          amount: transaction['amount'] as String,
          date: transaction['date'] as String,
          icon: transaction['icon'] as IconData,
          isCredit: transaction['isCredit'] as bool,
        )),
      ],
    );
  }
  
  Widget _buildTransactionCard({
    required String title,
    required String subtitle,
    required String amount,
    required String date,
    required IconData icon,
    required bool isCredit,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
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
              color: isCredit
                  ? Colors.green.shade50
                  : Colors.red.shade50,
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: isCredit
                  ? Colors.green.shade700
                  : Colors.red.shade700,
              size: 20,
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
                const SizedBox(height: 4),
                Text(
                  date,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade500,
                  ),
                ),
              ],
            ),
          ),
          Text(
            amount,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: isCredit
                  ? Colors.green.shade700
                  : Colors.red.shade700,
            ),
          ),
        ],
      ),
    );
  }
}
