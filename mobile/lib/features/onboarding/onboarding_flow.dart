import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../services/api/api_client.dart';
import 'presentation/screens/welcome_screen.dart';
import 'presentation/screens/role_selection_screen.dart';
import 'presentation/screens/phone_input_screen.dart';
import 'presentation/screens/otp_screen.dart';
import 'presentation/screens/complete_profile_screen.dart';

/// Key used to persist onboarding completion state.
const String kOnboardingCompletedKey = 'onboarding_completed';

/// Checks whether onboarding has been completed.
Future<bool> isOnboardingCompleted() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getBool(kOnboardingCompletedKey) ?? false;
}

/// Marks onboarding as completed in local storage.
Future<void> markOnboardingCompleted() async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setBool(kOnboardingCompletedKey, true);
}

/// Available user roles.
enum UserRole { collector, household }

/// Holds state accumulated during the onboarding flow.
class OnboardingData {
  UserRole? selectedRole;
  String? phoneNumber;
  String? phonePrefix;      // e.g. "+237"
  String? countryCode;      // e.g. "cmr"
  bool otpVerified;
  String? devModeOtp;       // Only set when backend returns OTP in dev mode

  OnboardingData({
    this.selectedRole,
    this.phoneNumber,
    this.phonePrefix = '+237',
    this.countryCode = 'cmr',
    this.otpVerified = false,
    this.devModeOtp,
  });
}

/// Entry widget for the entire onboarding flow.
class OnboardingFlow extends StatefulWidget {
  final VoidCallback onComplete;
  final VoidCallback onLogin;
  final ApiClient? apiClient;

  const OnboardingFlow({
    super.key,
    required this.onComplete,
    required this.onLogin,
    this.apiClient,
  });

  @override
  State<OnboardingFlow> createState() => _OnboardingFlowState();
}

class _OnboardingFlowState extends State<OnboardingFlow> {
  final OnboardingData _data = OnboardingData();
  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();

  @override
  Widget build(BuildContext context) {
    return Navigator(
      key: _navigatorKey,
      onGenerateRoute: (settings) {
        return MaterialPageRoute(
          builder: (_) => WelcomeScreen(
            onGetStarted: _goToRoleSelection,
            onLogin: widget.onLogin,
          ),
        );
      },
    );
  }

  void _goToRoleSelection() {
    _navigatorKey.currentState?.push(
      _slide(
        RoleSelectionScreen(
          selectedRole: _data.selectedRole,
          onRoleSelected: (role) {
            _data.selectedRole = role;
          },
          onContinue: _goToPhoneInput,
          onBack: () => _navigatorKey.currentState?.pop(),
        ),
      ),
    );
  }

  void _goToPhoneInput({String? errorMessage}) {
    _navigatorKey.currentState?.push(
      _slide(
        PhoneInputScreen(
          initialPhone: _data.phoneNumber,
          initialCountryCode: _data.phonePrefix ?? '+237',
          errorMessage: errorMessage,
          apiClient: widget.apiClient!,
          onSendCode: (phone, phonePrefix, countryCode, error, devModeOtp) {
            _data.phoneNumber = phone;
            _data.phonePrefix = phonePrefix;
            _data.countryCode = countryCode;
            _data.devModeOtp = devModeOtp;
            if (error != null) {
              // Stay on phone input and show error
              // The phone input screen will handle showing the error
              return;
            }
            _goToOtp();
          },
          onBack: () => _navigatorKey.currentState?.pop(),
        ),
      ),
    );
  }

  void _goToOtp({String? errorMessage}) {
    _navigatorKey.currentState?.push(
      _slide(
        OtpScreen(
          phoneNumber: '${_data.phonePrefix} ${_data.phoneNumber}',
          errorMessage: errorMessage,
          devModeOtp: _data.devModeOtp,
          apiClient: widget.apiClient!,
          onVerified: () {
            _data.otpVerified = true;
            _goToCompleteProfile();
          },
          onBack: () => _navigatorKey.currentState?.pop(),
        ),
      ),
    );
  }

  void _goToCompleteProfile() {
    _navigatorKey.currentState?.push(
      _slide(
        CompleteProfileScreen(
          phone: '${_data.phonePrefix}${_data.phoneNumber}',
          countryCode: _data.countryCode ?? 'cmr',
          role: _data.selectedRole ?? UserRole.household,
          onComplete: () async {
            await markOnboardingCompleted();
            widget.onComplete();
          },
          onBack: () => _navigatorKey.currentState?.pop(),
        ),
      ),
    );
  }

  Route _slide(Widget page) {
    return PageRouteBuilder(
      pageBuilder: (context, animation, secondaryAnimation) => page,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        final tween = Tween(begin: const Offset(1.0, 0.0), end: Offset.zero)
            .chain(CurveTween(curve: Curves.easeOutCubic));
        return SlideTransition(position: animation.drive(tween), child: child);
      },
      transitionDuration: const Duration(milliseconds: 350),
    );
  }
}
