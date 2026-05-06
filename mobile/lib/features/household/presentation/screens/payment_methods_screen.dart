import 'package:flutter/material.dart';
import '../../../../config/app_theme.dart';

class PaymentMethod {
  final String id;
  final String type;
  final String title;
  final String? subtitle;
  final String? last4;
  final bool isDefault;
  final IconData icon;

  const PaymentMethod({
    required this.id,
    required this.type,
    required this.title,
    this.subtitle,
    this.last4,
    this.isDefault = false,
    required this.icon,
  });
}

class PaymentMethodsScreen extends StatefulWidget {
  const PaymentMethodsScreen({super.key});

  @override
  State<PaymentMethodsScreen> createState() => _PaymentMethodsScreenState();
}

class _PaymentMethodsScreenState extends State<PaymentMethodsScreen> {
  final List<PaymentMethod> _paymentMethods = [
    const PaymentMethod(
      id: '1',
      type: 'mobile_money',
      title: 'Mobile Money',
      subtitle: 'MTN Cameroon',
      last4: '6700',
      isDefault: true,
      icon: Icons.phone_android,
    ),
    const PaymentMethod(
      id: '2',
      type: 'mobile_money',
      title: 'Mobile Money',
      subtitle: 'Orange Cameroon',
      last4: '6900',
      isDefault: false,
      icon: Icons.phone_android,
    ),
    const PaymentMethod(
      id: '3',
      type: 'card',
      title: 'Visa',
      subtitle: 'Credit Card',
      last4: '4242',
      isDefault: false,
      icon: Icons.credit_card,
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
          'Payment Methods',
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
          // Payment Methods List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: _paymentMethods.length,
              itemBuilder: (context, index) {
                final method = _paymentMethods[index];
                return _buildPaymentMethodCard(method, index);
              },
            ),
          ),
          
          // Add Payment Method Button
          _buildAddPaymentMethodButton(),
        ],
      ),
    );
  }
  
  Widget _buildPaymentMethodCard(PaymentMethod method, int index) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: method.isDefault ? AppColors.primary : Colors.grey.shade200,
          width: method.isDefault ? 2 : 1,
        ),
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
              color: AppColors.primaryLight.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              method.icon,
              color: AppColors.primary,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      method.title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
                      ),
                    ),
                    if (method.isDefault) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text(
                          'Default',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                if (method.subtitle != null)
                  Text(
                    method.subtitle!,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade600,
                    ),
                  ),
                if (method.last4 != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    '•••• ${method.last4}',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade500,
                      fontFamily: 'monospace',
                    ),
                  ),
                ],
              ],
            ),
          ),
          PopupMenuButton<String>(
            icon: Icon(Icons.more_vert, color: Colors.grey.shade600),
            onSelected: (value) {
              _handleMenuAction(value, method, index);
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'edit',
                child: Row(
                  children: [
                    Icon(Icons.edit, size: 18),
                    SizedBox(width: 8),
                    Text('Edit'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'delete',
                child: Row(
                  children: [
                    Icon(Icons.delete, size: 18, color: Colors.red),
                    SizedBox(width: 8),
                    Text('Delete', style: TextStyle(color: Colors.red)),
                  ],
                ),
              ),
              if (!method.isDefault)
                const PopupMenuItem(
                  value: 'default',
                  child: Row(
                    children: [
                      Icon(Icons.star, size: 18),
                      SizedBox(width: 8),
                      Text('Set as Default'),
                    ],
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
  
  Widget _buildAddPaymentMethodButton() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  elevation: 0,
                ),
                onPressed: _showAddPaymentMethodDialog,
                icon: const Icon(Icons.add),
                label: const Text(
                  'Add Payment Method',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  void _handleMenuAction(String action, PaymentMethod method, int index) {
    switch (action) {
      case 'edit':
        _showEditPaymentMethodDialog(method, index);
        break;
      case 'delete':
        _showDeleteConfirmDialog(method, index);
        break;
      case 'default':
        _setDefaultPaymentMethod(index);
        break;
    }
  }
  
  void _showAddPaymentMethodDialog() {
    _showPaymentMethodDialog(null);
  }
  
  void _showEditPaymentMethodDialog(PaymentMethod method, int index) {
    _showPaymentMethodDialog(method, index: index);
  }
  
  void _showPaymentMethodDialog(PaymentMethod? method, {int? index}) {
    String selectedType = method?.type ?? 'mobile_money';
    final titleController = TextEditingController(text: method?.title ?? '');
    final last4Controller = TextEditingController(text: method?.last4 ?? '');
    
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            title: Text(method == null ? 'Add Payment Method' : 'Edit Payment Method'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Payment Type Selection
                  const Text(
                    'Payment Type',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _buildPaymentTypeOption(
                        type: 'mobile_money',
                        label: 'Mobile Money',
                        icon: Icons.phone_android,
                        isSelected: selectedType == 'mobile_money',
                        onTap: () {
                          setDialogState(() {
                            selectedType = 'mobile_money';
                          });
                        },
                      ),
                      const SizedBox(width: 12),
                      _buildPaymentTypeOption(
                        type: 'card',
                        label: 'Card',
                        icon: Icons.credit_card,
                        isSelected: selectedType == 'card',
                        onTap: () {
                          setDialogState(() {
                            selectedType = 'card';
                          });
                        },
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 16),
                  
                  TextField(
                    controller: titleController,
                    decoration: InputDecoration(
                      labelText: selectedType == 'mobile_money' ? 'Provider (e.g., MTN, Orange)' : 'Card Type (e.g., Visa, Mastercard)',
                      border: const OutlineInputBorder(),
                    ),
                  ),
                  
                  const SizedBox(height: 16),
                  
                  TextField(
                    controller: last4Controller,
                    keyboardType: TextInputType.number,
                    maxLength: 4,
                    decoration: const InputDecoration(
                      labelText: 'Last 4 digits',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  // Save payment method logic
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        method == null ? 'Payment method added' : 'Payment method updated',
                      ),
                    ),
                  );
                },
                child: Text(
                  'Save',
                  style: TextStyle(color: AppColors.primary),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
  
  Widget _buildPaymentTypeOption({
    required String type,
    required String label,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primaryLight.withValues(alpha: 0.2) : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? AppColors.primary : Colors.grey.shade300,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Column(
            children: [
              Icon(
                icon,
                color: isSelected ? AppColors.primary : Colors.grey.shade600,
                size: 24,
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                  color: isSelected ? AppColors.primary : Colors.grey.shade700,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  void _showDeleteConfirmDialog(PaymentMethod method, int index) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Text('Delete Payment Method'),
        content: Text(
          'Are you sure you want to delete ${method.title}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              setState(() {
                _paymentMethods.removeAt(index);
              });
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Payment method deleted')),
              );
            },
            child: Text(
              'Delete',
              style: TextStyle(color: Colors.red.shade600),
            ),
          ),
        ],
      ),
    );
  }
  
  void _setDefaultPaymentMethod(int index) {
    setState(() {
      for (int i = 0; i < _paymentMethods.length; i++) {
        _paymentMethods[i] = PaymentMethod(
          id: _paymentMethods[i].id,
          type: _paymentMethods[i].type,
          title: _paymentMethods[i].title,
          subtitle: _paymentMethods[i].subtitle,
          last4: _paymentMethods[i].last4,
          isDefault: i == index,
          icon: _paymentMethods[i].icon,
        );
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Default payment method updated')),
    );
  }
}
