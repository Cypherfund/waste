import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
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
class OnboardingFlow extends StatefulWidget {
  final VoidCallback onComplete;
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

  void _goToPhoneInput() {
    _navigatorKey.currentState?.push(
      _slide(
        PhoneInputScreen(
          initialPhone: _data.phoneNumber,
          initialCountryCode: _data.countryCode ?? '+237',
          onSendCode: (phone, code) {
            _data.phoneNumber = phone;
            _data.countryCode = code;
            _goToOtp();
          },
          onBack: () => _navigatorKey.currentState?.pop(),
        ),
      ),
    );
  }

  void _goToOtp() {
    _navigatorKey.currentState?.push(
      _slide(
        OtpScreen(
          phoneNumber: '${_data.countryCode} ${_data.phoneNumber}',
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
          phone: '${_data.countryCode}${_data.phoneNumber}',
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
