/// Payment provider modes
enum PaymentProviderMode {
  manual,
  integrated,
  cash,
}

/// Payment result types for PaymentResultScreen
enum PaymentResultType {
  submitted,    // Manual payment submitted, awaiting verification
  success,      // Integrated payment successful
  failed,       // Payment failed/rejected
  cash,         // Cash booking created
}
