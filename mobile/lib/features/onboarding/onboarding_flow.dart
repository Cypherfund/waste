import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'presentation/screens/welcome_screen.dart';
import 'presentation/screens/role_selection_screen.dart';
import 'presentation/screens/phone_input_screen.dart';
import 'presentation/screens/otp_screen.dart';

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
///
/// This is a simple value object passed forward through the screens.
/// It does NOT touch any backend/API — that happens in the existing
/// auth flow after onboarding completes.
class OnboardingData {
  UserRole? selectedRole;
  String? phoneNumber;
  String? countryCode;
  bool otpVerified;

  OnboardingData({
    this.selectedRole,
    this.phoneNumber,
    this.countryCode = '+237',
    this.otpVerified = false,
  });
}

/// Entry widget for the entire onboarding flow.
///
/// Uses a [Navigator] internally so the flow is self-contained and
/// does not pollute the app's root route table.
class OnboardingFlow extends StatefulWidget {
  /// Called when onboarding completes successfully.
  final VoidCallback onComplete;

  /// Called when the user taps "I already have an account".
  final VoidCallback onLogin;

  const OnboardingFlow({
    super.key,
    required this.onComplete,
    required this.onLogin,
  });

  @override
  State<OnboardingFlow> createState() => _OnboardingFlowState();
}

class _OnboardingFlowState extends State<OnboardingFlow> {
  final OnboardingData _data = OnboardingData();

  @override
  Widget build(BuildContext context) {
    return Navigator(
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
    Navigator.of(context).push(
      _slide(
        RoleSelectionScreen(
          selectedRole: _data.selectedRole,
          onRoleSelected: (role) {
            _data.selectedRole = role;
          },
          onContinue: _goToPhoneInput,
          onBack: () => Navigator.of(context).pop(),
        ),
      ),
    );
  }

  void _goToPhoneInput() {
    Navigator.of(context).push(
      _slide(
        PhoneInputScreen(
          initialPhone: _data.phoneNumber,
          initialCountryCode: _data.countryCode ?? '+237',
          onSendCode: (phone, code) {
            _data.phoneNumber = phone;
            _data.countryCode = code;
            _goToOtp();
          },
          onBack: () => Navigator.of(context).pop(),
        ),
      ),
    );
  }

  void _goToOtp() {
    Navigator.of(context).push(
      _slide(
        OtpScreen(
          phoneNumber: '${_data.countryCode} ${_data.phoneNumber}',
          onVerified: () async {
            _data.otpVerified = true;
            await markOnboardingCompleted();
            widget.onComplete();
          },
          onBack: () => Navigator.of(context).pop(),
        ),
      ),
    );
  }

  /// Slide-right page transition matching modern mobile patterns.
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
