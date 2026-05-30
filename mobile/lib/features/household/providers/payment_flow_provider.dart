import 'package:flutter/material.dart';
import '../../../models/job.dart';
import '../../../models/subscription.dart';
import 'payment_flow_enums.dart';
export 'payment_flow_enums.dart';

/// Provider to manage state across the multi-screen payment flow
class PaymentFlowProvider extends ChangeNotifier {
  // Pickup details
  DateTime? scheduledDate;
  String? scheduledTime;
  String? locationAddress;
  String? locationArea;
  String? landmark;
  double? locationLat;
  double? locationLng;

  // Pickup type
  String pickupType = 'oneTime'; // 'oneTime' | 'monthly'

  // Pricing
  PricingQuote? pricingQuote;
  double get amountDue {
    if (isWalletTopUpContext) {
      return walletTopUpAmount ?? 0;
    }
    return isSubscriptionContext
        ? (_subscriptionAmountDue ?? 0)
        : (pricingQuote?.quotedPrice ?? 0);
  }
  bool get isFree => pricingQuote?.isCoveredBySubscription ?? false;

  // Payment method selection
  String? selectedProviderId;
  String? selectedProviderName;
  PaymentProviderMode? selectedProviderMode;
  String? selectedPaymentMethodCode; // 'MTN_MOMO', 'ORANGE_MONEY', 'CASH'

  // Manual payment details
  String? paymentRef;
  String? paymentProofUrl;

  // Integrated payment details
  String? paymentPhone;
  String? providerTransactionId;

  // Subscription context
  bool isSubscriptionContext = false;
  String? subscriptionPlanId;

  // Cash on First Pickup context
  bool isCashOnFirstPickup = false;
  String? cashFirstPickupPlanId;

  // Wallet top-up context
  bool isWalletTopUpContext = false;
  double? walletTopUpAmount;

  // Override amountDue for subscription context (plan price)
  double? _subscriptionAmountDue;

  // Job created during flow
  Job? createdJob;

  // Result type for PaymentResultScreen
  PaymentResultType? resultType;

  // Loading states
  bool _isCreatingJob = false;
  bool _isUploadingProof = false;
  bool _isInitiatingPayment = false;

  bool get isCreatingJob => _isCreatingJob;
  bool get isUploadingProof => _isUploadingProof;
  bool get isInitiatingPayment => _isInitiatingPayment;

  // Error state
  String? error;

  /// Initialize with pickup details
  void initPickupDetails({
    required DateTime scheduledDate,
    required String scheduledTime,
    required String locationAddress,
    String? locationArea,
    String? landmark,
    double? locationLat,
    double? locationLng,
    String? pickupType,
  }) {
    this.scheduledDate = scheduledDate;
    this.scheduledTime = scheduledTime;
    this.locationAddress = locationAddress;
    this.locationArea = locationArea;
    this.landmark = landmark;
    this.locationLat = locationLat;
    this.locationLng = locationLng;
    if (pickupType != null) this.pickupType = pickupType;
    pricingQuote = null; // reset so fresh pricing is synced from SubscriptionProvider
    notifyListeners();
  }

  /// Set pricing quote
  void setPricingQuote(PricingQuote quote) {
    pricingQuote = quote;
    notifyListeners();
  }

  /// Select payment method
  void selectPaymentMethod({
    required String providerId,
    required String providerName,
    required PaymentProviderMode mode,
    required String paymentMethodCode,
  }) {
    selectedProviderId = providerId;
    selectedProviderName = providerName;
    selectedProviderMode = mode;
    selectedPaymentMethodCode = paymentMethodCode;
    notifyListeners();
  }

  /// Select cash payment
  void selectCash() {
    selectedProviderId = 'CASH';
    selectedProviderName = 'Cash to Collector';
    selectedProviderMode = PaymentProviderMode.cash;
    selectedPaymentMethodCode = 'CASH';
    notifyListeners();
  }

  /// Select wallet payment
  void selectWallet() {
    selectedProviderId = 'WALLET';
    selectedProviderName = 'Wallet Balance';
    selectedProviderMode = PaymentProviderMode.wallet;
    selectedPaymentMethodCode = 'WALLET';
    notifyListeners();
  }

  /// Set manual payment details
  void setManualPaymentDetails({
    required String paymentRef,
    String? paymentProofUrl,
  }) {
    this.paymentRef = paymentRef;
    this.paymentProofUrl = paymentProofUrl;
    notifyListeners();
  }

  /// Set integrated payment phone
  void setPaymentPhone(String phone) {
    paymentPhone = phone;
    notifyListeners();
  }

  /// Set provider transaction ID
  void setProviderTransactionId(String id) {
    providerTransactionId = id;
    notifyListeners();
  }

  /// Set created job
  void setCreatedJob(Job job) {
    createdJob = job;
    notifyListeners();
  }

  /// Set result type
  void setResultType(PaymentResultType type) {
    resultType = type;
    notifyListeners();
  }

  /// Set loading states
  void setCreatingJob(bool value) {
    _isCreatingJob = value;
    notifyListeners();
  }

  void setUploadingProof(bool value) {
    _isUploadingProof = value;
    notifyListeners();
  }

  void setInitiatingPayment(bool value) {
    _isInitiatingPayment = value;
    notifyListeners();
  }

  /// Set error
  void setError(String? errorMessage) {
    error = errorMessage;
    notifyListeners();
  }

  /// Set subscription context — clears pickup job state
  void setSubscriptionContext(String planId, {double? planPrice}) {
    isSubscriptionContext = true;
    subscriptionPlanId = planId;
    _subscriptionAmountDue = planPrice;
    createdJob = null;
    scheduledDate = null;
    scheduledTime = null;
    resultType = null;
    error = null;
    notifyListeners();
  }

  /// Clear subscription context — called on result exit or back navigation
  void clearSubscriptionContext() {
    isSubscriptionContext = false;
    subscriptionPlanId = null;
    _subscriptionAmountDue = null;
    notifyListeners();
  }

  /// Set cash on first pickup context
  void setCashOnFirstPickupContext(String planId, {double? planPrice}) {
    isCashOnFirstPickup = true;
    cashFirstPickupPlanId = planId;
    _subscriptionAmountDue = planPrice;
    createdJob = null;
    resultType = null;
    error = null;
    notifyListeners();
  }

  /// Clear cash on first pickup context
  void clearCashOnFirstPickupContext() {
    isCashOnFirstPickup = false;
    cashFirstPickupPlanId = null;
    _subscriptionAmountDue = null;
    notifyListeners();
  }

  /// Set wallet top-up context
  void setWalletTopUpContext(double amount) {
    isWalletTopUpContext = true;
    walletTopUpAmount = amount;
    createdJob = null;
    scheduledDate = null;
    scheduledTime = null;
    resultType = null;
    error = null;
    notifyListeners();
  }

  /// Clear wallet top-up context
  void clearWalletTopUpContext() {
    isWalletTopUpContext = false;
    walletTopUpAmount = null;
    notifyListeners();
  }

  /// Set the amount due directly (used for subscription plan price)
  void setAmountDue(double amount) {
    _subscriptionAmountDue = amount;
    notifyListeners();
  }

  /// Clear error
  void clearError() {
    error = null;
    notifyListeners();
  }

  /// Reset for new flow
  void reset() {
    scheduledDate = null;
    scheduledTime = null;
    locationAddress = null;
    locationArea = null;
    landmark = null;
    locationLat = null;
    locationLng = null;
    pricingQuote = null;
    selectedProviderId = null;
    selectedProviderName = null;
    selectedProviderMode = null;
    selectedPaymentMethodCode = null;
    paymentRef = null;
    paymentProofUrl = null;
    paymentPhone = null;
    providerTransactionId = null;
    createdJob = null;
    resultType = null;
    isSubscriptionContext = false;
    subscriptionPlanId = null;
    _subscriptionAmountDue = null;
    isCashOnFirstPickup = false;
    cashFirstPickupPlanId = null;
    isWalletTopUpContext = false;
    walletTopUpAmount = null;
    _isCreatingJob = false;
    _isUploadingProof = false;
    _isInitiatingPayment = false;
    error = null;
    notifyListeners();
  }

  /// Get full address with landmark
  String get fullAddress {
    if (landmark != null && landmark!.trim().isNotEmpty) {
      return '$locationAddress (Near: $landmark)';
    }
    return locationAddress ?? '';
  }
}
