import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../config/app_config.dart';
import '../storage/secure_storage.dart';

class ApiClient {
  late final Dio dio;
  final SecureStorageService _storage;
  VoidCallback? onUnauthorized;

  ApiClient({required SecureStorageService storage}) : _storage = storage {
    dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Content-Type': 'application/json'},
      validateStatus: (status) => status != null && (status >= 200 && status < 300 || status == 304),
    ));

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.getAccessToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          final path = error.requestOptions.path;
          debugPrint('[ApiClient] 401 on $path');

          // Don't try to refresh or logout on auth endpoints — those errors
          // mean the credentials/refresh token are invalid and should be
          // handled by the caller (e.g. show "wrong password").
          if (path.startsWith('/auth/')) {
            handler.next(error);
            return;
          }

          final refreshed = await _tryRefreshToken();
          if (refreshed) {
            final retryOptions = error.requestOptions;
            final token = await _storage.getAccessToken();
            retryOptions.headers['Authorization'] = 'Bearer $token';
            try {
              final response = await dio.fetch(retryOptions);
              handler.resolve(response);
              return;
            } catch (e) {
              debugPrint('[ApiClient] Retry after refresh failed: $e');
            }
          }
          debugPrint('[ApiClient] Triggering onUnauthorized -> logout');
          onUnauthorized?.call();
        }
        handler.next(error);
      },
    ));
  }

  Future<bool> _tryRefreshToken() async {
    try {
      final refreshToken = await _storage.getRefreshToken();
      if (refreshToken == null) return false;

      final response = await Dio(BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        headers: {'Content-Type': 'application/json'},
      )).post('/auth/refresh', data: {'refreshToken': refreshToken});

      final newAccessToken = response.data['accessToken'] as String;
      final newRefreshToken = response.data['refreshToken'] as String;

      await _storage.saveTokens(
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  static String extractErrorMessage(dynamic error) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map<String, dynamic>) {
        final message = data['message'];
        if (message is String) return message;
        if (message is List) return message.join(', ');
      }
      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout) {
        return 'Connection timed out. Please try again.';
      }
      if (error.type == DioExceptionType.connectionError) {
        return 'Unable to connect to server. Check your internet connection.';
      }
      if (error.type == DioExceptionType.cancel) {
        return 'Request was cancelled. Please try again.';
      }
      final statusCode = error.response?.statusCode;
      if (statusCode == 401) return 'Session expired. Please log in again.';
      if (statusCode == 403) return 'You do not have permission to perform this action.';
      if (statusCode == 404) return 'The requested resource was not found.';
      if (statusCode != null && statusCode >= 500) return 'Server error. Please try again later.';
      return 'An unexpected error occurred. Please try again.';
    }
    if (error is Exception) {
      final msg = error.toString().replaceFirst('Exception: ', '');
      // Don't leak internal exception class names to the user
      if (msg.contains('DioException') || msg.contains('SocketException') || msg.contains('HandshakeException')) {
        return 'Unable to connect to server. Check your internet connection.';
      }
      return msg;
    }
    return 'An unexpected error occurred. Please try again.';
  }
}
