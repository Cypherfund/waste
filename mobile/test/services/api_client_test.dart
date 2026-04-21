import 'package:flutter_test/flutter_test.dart';
import 'package:dio/dio.dart';
import 'package:wastewise/services/api/api_client.dart';

void main() {
  group('ApiClient.extractErrorMessage', () {
    test('extracts message string from DioException response', () {
      final error = DioException(
        requestOptions: RequestOptions(path: '/test'),
        response: Response(
          requestOptions: RequestOptions(path: '/test'),
          statusCode: 400,
          data: {'message': 'Validation failed'},
        ),
      );

      expect(ApiClient.extractErrorMessage(error), 'Validation failed');
    });

    test('joins message array from DioException response', () {
      final error = DioException(
        requestOptions: RequestOptions(path: '/test'),
        response: Response(
          requestOptions: RequestOptions(path: '/test'),
          statusCode: 400,
          data: {
            'message': ['Field A is required', 'Field B is invalid']
          },
        ),
      );

      expect(
        ApiClient.extractErrorMessage(error),
        'Field A is required, Field B is invalid',
      );
    });

    test('returns timeout message for connection timeout', () {
      final error = DioException(
        requestOptions: RequestOptions(path: '/test'),
        type: DioExceptionType.connectionTimeout,
      );

      expect(
        ApiClient.extractErrorMessage(error),
        'Connection timed out. Please try again.',
      );
    });

    test('returns timeout message for receive timeout', () {
      final error = DioException(
        requestOptions: RequestOptions(path: '/test'),
        type: DioExceptionType.receiveTimeout,
      );

      expect(
        ApiClient.extractErrorMessage(error),
        'Connection timed out. Please try again.',
      );
    });

    test('returns connection error message', () {
      final error = DioException(
        requestOptions: RequestOptions(path: '/test'),
        type: DioExceptionType.connectionError,
      );

      expect(
        ApiClient.extractErrorMessage(error),
        'Unable to connect to server. Check your internet connection.',
      );
    });

    test('returns toString for non-DioException', () {
      final error = Exception('Something went wrong');
      expect(
        ApiClient.extractErrorMessage(error),
        contains('Something went wrong'),
      );
    });
  });
}
