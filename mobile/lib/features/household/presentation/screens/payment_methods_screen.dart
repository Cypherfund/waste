import 'package:flutter/material.dart';
import '../../../shared/payment_methods_setup_screen.dart';

class PaymentMethodsScreen extends StatelessWidget {
  const PaymentMethodsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Navigate to the shared payment methods setup screen in cashin mode
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Navigator.pushReplacementNamed(
        context,
        '/payment-methods-setup',
        arguments: {'mode': 'cashin'},
      );
    });

    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}
