import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../config/app_theme.dart';

class Transaction {
  final String id;
  final String title;
  final String? subtitle;
  final double amount;
  final DateTime date;
  final String type; // 'credit' or 'debit'
  final String? category; // 'pickup', 'top_up', 'transfer', etc.
  final String status; // 'completed', 'pending', 'failed'

  const Transaction({
    required this.id,
    required this.title,
    this.subtitle,
    required this.amount,
    required this.date,
    required this.type,
    this.category,
    this.status = 'completed',
  });
}

class TransactionHistoryScreen extends StatefulWidget {
  const TransactionHistoryScreen({super.key});

  @override
  State<TransactionHistoryScreen> createState() => _TransactionHistoryScreenState();
}

class _TransactionHistoryScreenState extends State<TransactionHistoryScreen> {
  String _selectedFilter = 'all';
  
  final List<Transaction> _transactions = [
    const Transaction(
      id: '1',
      title: 'Pickup Payment',
      subtitle: 'Booking #ABC12345',
      amount: -2500,
      date: DateTime(2026, 4, 25, 14, 30),
      type: 'debit',
      category: 'pickup',
      status: 'completed',
    ),
    const Transaction(
      id: '2',
      title: 'Top Up',
      subtitle: 'Mobile Money - MTN',
      amount: 10000,
      date: DateTime(2026, 4, 24, 10, 15),
      type: 'credit',
      category: 'top_up',
      status: 'completed',
    ),
    const Transaction(
      id: '3',
      title: 'Pickup Payment',
      subtitle: 'Booking #DEF67890',
      amount: -2500,
      date: DateTime(2026, 4, 20, 16, 45),
      type: 'debit',
      category: 'pickup',
      status: 'completed',
    ),
    const Transaction(
      id: '4',
      title: 'Top Up',
      subtitle: 'Bank Transfer',
      amount: 20000,
      date: DateTime(2026, 4, 18, 9, 0),
      type: 'credit',
      category: 'top_up',
      status: 'completed',
    ),
    const Transaction(
      id: '5',
      title: 'Pickup Payment',
      subtitle: 'Booking #GHI11223',
      amount: -2500,
      date: DateTime(2026, 4, 15, 11, 20),
      type: 'debit',
      category: 'pickup',
      status: 'completed',
    ),
    const Transaction(
      id: '6',
      title: 'Top Up',
      subtitle: 'Mobile Money - Orange',
      amount: 5000,
      date: DateTime(2026, 4, 10, 14, 0),
      type: 'credit',
      category: 'top_up',
      status: 'completed',
    ),
    const Transaction(
      id: '7',
      title: 'Pickup Payment',
      subtitle: 'Booking #JKL44556',
      amount: -2500,
      date: DateTime(2026, 4, 8, 9, 30),
      type: 'debit',
      category: 'pickup',
      status: 'completed',
    ),
    const Transaction(
      id: '8',
      title: 'Top Up',
      subtitle: 'Mobile Money - MTN',
      amount: 15000,
      date: DateTime(2026, 4, 5, 16, 45),
      type: 'credit',
      category: 'top_up',
      status: 'completed',
    ),
  ];

  List<Transaction> get _filteredTransactions {
    switch (_selectedFilter) {
      case 'credit':
        return _transactions.where((t) => t.type == 'credit').toList();
      case 'debit':
        return _transactions.where((t) => t.type == 'debit').toList();
      default:
        return _transactions;
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
          'Transaction History',
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
          // Filter Chips
          _buildFilterChips(),
          
          // Transactions List
          Expanded(
            child: _filteredTransactions.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    padding: const EdgeInsets.all(20),
                    itemCount: _filteredTransactions.length,
                    itemBuilder: (context, index) {
                      final transaction = _filteredTransactions[index];
                      return _buildTransactionCard(transaction);
                    },
                  ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildFilterChips() {
    return Container(
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          _buildFilterChip('All', 'all'),
          const SizedBox(width: 8),
          _buildFilterChip('Credits', 'credit'),
          const SizedBox(width: 8),
          _buildFilterChip('Debits', 'debit'),
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
  
  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.receipt_long,
              size: 100,
              color: Colors.grey.shade300,
            ),
            const SizedBox(height: 24),
            Text(
              'No ${_selectedFilter == 'all' ? '' : _selectedFilter} transactions',
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Your transaction history will appear here',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildTransactionCard(Transaction transaction) {
    final isCredit = transaction.type == 'credit';
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
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
              isCredit ? Icons.add_circle_outline : Icons.remove_circle_outline,
              color: isCredit ? Colors.green.shade700 : Colors.red.shade700,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  transaction.title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.black87,
                  ),
                ),
                if (transaction.subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    transaction.subtitle!,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text(
                      _formatDate(transaction.date),
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade500,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: _getStatusColor(transaction.status).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        transaction.status.toUpperCase(),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: _getStatusColor(transaction.status),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${isCredit ? '+' : '-'}${transaction.amount.toStringAsFixed(0)} XAF',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isCredit ? Colors.green.shade700 : Colors.red.shade700,
                ),
              ),
              const SizedBox(height: 4),
              Icon(
                Icons.chevron_right,
                color: Colors.grey.shade400,
                size: 20,
              ),
            ],
          ),
        ],
      ),
    );
  }
  
  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);
    
    if (difference.inDays == 0) {
      return 'Today, ${DateFormat('h:mm a').format(date)}';
    } else if (difference.inDays == 1) {
      return 'Yesterday, ${DateFormat('h:mm a').format(date)}';
    } else if (difference.inDays < 7) {
      return '${DateFormat('EEEE').format(date)}, ${DateFormat('h:mm a').format(date)}';
    } else {
      return DateFormat('d MMM, h:mm a').format(date);
    }
  }
  
  Color _getStatusColor(String status) {
    switch (status) {
      case 'completed':
        return Colors.green;
      case 'pending':
        return Colors.orange;
      case 'failed':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}
