import 'dart:async';
import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class DeepLinkService {
  StreamSubscription? _sub;
  String? _pendingReferralToken;
  final AppLinks _appLinks = AppLinks();

  String? get pendingReferralToken => _pendingReferralToken;

  Future<void> init() async {
    // Check if we have a stored token from previous session
    await _loadStoredToken();

    // Handle initial link (app opened from cold start)
    try {
      final initialLink = await _appLinks.getInitialLink();
      if (initialLink != null) {
        _handleLink(initialLink.toString());
      }
    } catch (e) {
      debugPrint('[DeepLink] Error getting initial link: $e');
    }

    // Handle incoming links while app is running
    _sub = _appLinks.uriLinkStream.listen((Uri? uri) {
      if (uri != null) {
        _handleLink(uri.toString());
      }
    }, onError: (err) {
      debugPrint('[DeepLink] Error on link stream: $err');
    });
  }

  Future<void> _loadStoredToken() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final storedToken = prefs.getString('referralToken');
      if (storedToken != null && storedToken.isNotEmpty) {
        _pendingReferralToken = storedToken;
        debugPrint('[DeepLink] Loaded stored referral token: $storedToken');
      }
    } catch (e) {
      debugPrint('[DeepLink] Error loading stored token: $e');
    }
  }

  Future<void> _storeToken(String token) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('referralToken', token);
      debugPrint('[DeepLink] Stored referral token: $token');
    } catch (e) {
      debugPrint('[DeepLink] Error storing token: $e');
    }
  }

  void _handleLink(String link) {
    debugPrint('[DeepLink] Received link: $link');
    
    // Extract referral token from URL
    // Expected formats:
    // - https://kmertrash.com/ref/{token}
    // - https://app.kmertrash.com?token={token}
    // - kmertrash://ref?token={token}
    // - kmertrash://ref/{token}
    final uri = Uri.parse(link);
    
    String? token;
    
    // Try query parameter first (for app.kmertrash.com?token=xxx or kmertrash://ref?token=xxx)
    token = uri.queryParameters['token'];
    
    // Fallback to path segment (for https://kmertrash.com/ref/xxx or kmertrash://ref/xxx)
    if (token == null && uri.pathSegments.length >= 2 && uri.pathSegments[0] == 'ref') {
      token = uri.pathSegments[1];
    }
    
    if (token != null && token.isNotEmpty) {
      _pendingReferralToken = token;
      _storeToken(token);
      debugPrint('[DeepLink] Extracted referral token: $token');
    }
  }

  void clearPendingToken() {
    _pendingReferralToken = null;
    // Also clear from storage
    SharedPreferences.getInstance().then((prefs) {
      prefs.remove('referralToken');
    });
  }

  void dispose() {
    _sub?.cancel();
  }
}
