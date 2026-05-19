import 'api_client.dart';

class AppNotification {
  final String id;
  final String type;
  final String title;
  final String body;
  final Map<String, dynamic> data;
  final bool isRead;
  final DateTime? sentAt;
  final DateTime? readAt;
  final DateTime createdAt;

  AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.data,
    required this.isRead,
    this.sentAt,
    this.readAt,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(
        id: j['id'] as String,
        type: (j['type'] as String?) ?? 'SYSTEM',
        title: (j['title'] as String?) ?? '',
        body: (j['body'] as String?) ?? '',
        data: (j['data'] as Map<String, dynamic>?) ?? {},
        isRead: j['readAt'] != null,
        sentAt: j['sentAt'] != null ? DateTime.parse(j['sentAt'] as String) : null,
        readAt: j['readAt'] != null ? DateTime.parse(j['readAt'] as String) : null,
        createdAt: DateTime.parse(j['createdAt'] as String),
      );
}

class NotificationsApi {
  final ApiClient _client;

  NotificationsApi(this._client);

  Future<List<AppNotification>> getNotifications({
    bool unreadOnly = false,
    int page = 1,
    int limit = 30,
  }) async {
    final response = await _client.dio.get('/notifications', queryParameters: {
      if (unreadOnly) 'unreadOnly': true,
      'page': page,
      'limit': limit,
    });
    final raw = response.data;
    List<dynamic> items;
    if (raw is Map && raw['data'] is List) {
      items = raw['data'] as List<dynamic>;
    } else if (raw is List) {
      items = raw;
    } else {
      items = [];
    }
    return items
        .map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> markAsRead(String id) async {
    await _client.dio.patch('/notifications/$id/read');
  }

  Future<void> markAllAsRead() async {
    await _client.dio.patch('/notifications/read-all');
  }
}
