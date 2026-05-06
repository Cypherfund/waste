import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:dio/dio.dart';
import 'package:wastewise/models/user.dart';
import 'package:wastewise/models/auth_response.dart';
import 'package:wastewise/providers/auth_provider.dart';
import 'package:wastewise/services/api/auth_api.dart';
import 'package:wastewise/services/storage/secure_storage.dart';
import 'package:wastewise/services/websocket/websocket_service.dart';

class MockAuthApi extends Mock implements AuthApi {}

class MockSecureStorage extends Mock implements SecureStorageService {}

class MockWebSocketService extends Mock implements WebSocketService {}

void main() {
  setUpAll(() {
    registerFallbackValue(User(
      id: 'fallback',
      name: 'Fallback',
      phone: '+237600000000',
      role: 'HOUSEHOLD',
      isActive: true,
      createdAt: DateTime(2026, 1, 1),
    ));
  });

  late MockAuthApi mockAuthApi;
  late MockSecureStorage mockStorage;
  late MockWebSocketService mockWsService;
  late AuthProvider provider;

  final testUser = User(
    id: 'user-1',
    name: 'John Doe',
    phone: '+237670000001',
    email: null,
    role: 'HOUSEHOLD',
    isActive: true,
    createdAt: DateTime(2026, 4, 1),
  );

  final testAuthResponse = AuthResponse(
    user: testUser,
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  );

  setUp(() {
    mockAuthApi = MockAuthApi();
    mockStorage = MockSecureStorage();
    mockWsService = MockWebSocketService();

    when(() => mockWsService.connect(
          accessToken: any(named: 'accessToken'),
          userId: any(named: 'userId'),
          role: any(named: 'role'),
        )).thenReturn(null);
    when(() => mockWsService.disconnect()).thenReturn(null);

    provider = AuthProvider(
      authApi: mockAuthApi,
      storage: mockStorage,
      wsService: mockWsService,
    );
  });

  group('AuthProvider', () {
    test('initial status is unknown', () {
      expect(provider.status, AuthStatus.unknown);
      expect(provider.user, isNull);
    });

    group('tryRestoreSession', () {
      test('restores session when valid user and token exist', () async {
        when(() => mockStorage.getUser()).thenAnswer((_) async => testUser);
        when(() => mockStorage.getAccessToken())
            .thenAnswer((_) async => 'stored-token');

        await provider.tryRestoreSession();

        expect(provider.status, AuthStatus.authenticated);
        expect(provider.user?.id, 'user-1');
        verify(() => mockWsService.connect(
              accessToken: 'stored-token',
              userId: 'user-1',
              role: 'HOUSEHOLD',
            )).called(1);
      });

      test('sets unauthenticated when no stored user', () async {
        when(() => mockStorage.getUser()).thenAnswer((_) async => null);
        when(() => mockStorage.getAccessToken()).thenAnswer((_) async => null);
        when(() => mockStorage.clearAll()).thenAnswer((_) async {});

        await provider.tryRestoreSession();

        expect(provider.status, AuthStatus.unauthenticated);
        expect(provider.user, isNull);
      });

      test('clears storage on non-household user', () async {
        final adminUser = User(
          id: 'admin-1',
          name: 'Admin',
          phone: '+237600000000',
          role: 'ADMIN',
          isActive: true,
          createdAt: DateTime(2026, 1, 1),
        );
        when(() => mockStorage.getUser()).thenAnswer((_) async => adminUser);
        when(() => mockStorage.getAccessToken())
            .thenAnswer((_) async => 'token');
        when(() => mockStorage.clearAll()).thenAnswer((_) async {});

        await provider.tryRestoreSession();

        expect(provider.status, AuthStatus.unauthenticated);
        verify(() => mockStorage.clearAll()).called(1);
      });
    });

    group('login', () {
      test('successful login sets authenticated state', () async {
        when(() => mockAuthApi.login(
              phone: '+237670000001',
              password: 'password123',
            )).thenAnswer((_) async => testAuthResponse);
        when(() => mockStorage.saveTokens(
              accessToken: any(named: 'accessToken'),
              refreshToken: any(named: 'refreshToken'),
            )).thenAnswer((_) async {});
        when(() => mockStorage.saveUser(any())).thenAnswer((_) async {});

        await provider.login(
          phone: '+237670000001',
          password: 'password123',
        );

        expect(provider.status, AuthStatus.authenticated);
        expect(provider.user?.name, 'John Doe');
        expect(provider.error, isNull);
        expect(provider.isLoading, false);
      });

      test('login failure sets error', () async {
        when(() => mockAuthApi.login(
              phone: any(named: 'phone'),
              password: any(named: 'password'),
            )).thenThrow(DioException(
          requestOptions: RequestOptions(path: '/auth/login'),
          response: Response(
            requestOptions: RequestOptions(path: '/auth/login'),
            statusCode: 401,
            data: {'message': 'Invalid phone number or password'},
          ),
        ));

        await provider.login(phone: '+237670000001', password: 'wrong');

        expect(provider.status, AuthStatus.unauthenticated);
        expect(provider.error, 'Invalid phone number or password');
        expect(provider.isLoading, false);
      });

      test('login rejects non-HOUSEHOLD/COLLECTOR users', () async {
        final adminResponse = AuthResponse(
          user: User(
            id: 'admin-1',
            name: 'Admin',
            phone: '+237670000002',
            role: 'ADMIN',
            isActive: true,
            createdAt: DateTime(2026, 1, 1),
          ),
          accessToken: 'token',
          refreshToken: 'refresh',
        );
        when(() => mockAuthApi.login(
              phone: any(named: 'phone'),
              password: any(named: 'password'),
            )).thenAnswer((_) async => adminResponse);

        await provider.login(phone: '+237670000002', password: 'pass');

        expect(provider.status, AuthStatus.unauthenticated);
        expect(provider.error, contains('household and collector users only'));
      });
    });

    group('register', () {
      test('successful register sets authenticated state', () async {
        when(() => mockAuthApi.register(
              name: 'John Doe',
              phone: '+237670000001',
              password: 'password123',
              role: 'HOUSEHOLD',
              email: null,
            )).thenAnswer((_) async => testAuthResponse);
        when(() => mockStorage.saveTokens(
              accessToken: any(named: 'accessToken'),
              refreshToken: any(named: 'refreshToken'),
            )).thenAnswer((_) async {});
        when(() => mockStorage.saveUser(any())).thenAnswer((_) async {});

        await provider.register(
          name: 'John Doe',
          phone: '+237670000001',
          password: 'password123',
          role: 'HOUSEHOLD',
        );

        expect(provider.status, AuthStatus.authenticated);
        expect(provider.user?.name, 'John Doe');
        expect(provider.isLoading, false);
      });

      test('register failure sets error', () async {
        when(() => mockAuthApi.register(
              name: any(named: 'name'),
              phone: any(named: 'phone'),
              password: any(named: 'password'),
              role: any(named: 'role'),
              email: any(named: 'email'),
            )).thenThrow(DioException(
          requestOptions: RequestOptions(path: '/auth/register'),
          response: Response(
            requestOptions: RequestOptions(path: '/auth/register'),
            statusCode: 409,
            data: {'message': 'Phone number already registered'},
          ),
        ));

        await provider.register(
          name: 'John',
          phone: '+237670000001',
          password: 'pass1234',
          role: 'HOUSEHOLD',
        );

        expect(provider.error, 'Phone number already registered');
        expect(provider.isLoading, false);
      });
    });

    group('logout', () {
      test('clears state and storage on logout', () async {
        // First login
        when(() => mockAuthApi.login(
              phone: any(named: 'phone'),
              password: any(named: 'password'),
            )).thenAnswer((_) async => testAuthResponse);
        when(() => mockStorage.saveTokens(
              accessToken: any(named: 'accessToken'),
              refreshToken: any(named: 'refreshToken'),
            )).thenAnswer((_) async {});
        when(() => mockStorage.saveUser(any())).thenAnswer((_) async {});
        await provider.login(phone: '+237670000001', password: 'pass');

        // Then logout
        when(() => mockAuthApi.logout()).thenAnswer((_) async {});
        when(() => mockStorage.clearAll()).thenAnswer((_) async {});

        await provider.logout();

        expect(provider.status, AuthStatus.unauthenticated);
        expect(provider.user, isNull);
        verify(() => mockStorage.clearAll()).called(1);
        verify(() => mockWsService.disconnect()).called(1);
      });
    });

    test('clearError clears the error', () async {
      when(() => mockAuthApi.login(
            phone: any(named: 'phone'),
            password: any(named: 'password'),
          )).thenThrow(DioException(
        requestOptions: RequestOptions(path: '/auth/login'),
        response: Response(
          requestOptions: RequestOptions(path: '/auth/login'),
          statusCode: 401,
          data: {'message': 'Invalid credentials'},
        ),
      ));

      await provider.login(phone: 'x', password: 'y');
      expect(provider.error, isNotNull);

      provider.clearError();
      expect(provider.error, isNull);
    });
  });
}
