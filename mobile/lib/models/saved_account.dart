import 'dart:convert';

class SavedAccount {
  final String id;
  final String name;
  final String phone;
  final String role;
  final String accessToken;
  final String refreshToken;

  SavedAccount({
    required this.id,
    required this.name,
    required this.phone,
    required this.role,
    required this.accessToken,
    required this.refreshToken,
  });

  bool get isHousehold => role == 'HOUSEHOLD';
  bool get isCollector => role == 'COLLECTOR';

  String get initials {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  factory SavedAccount.fromJson(Map<String, dynamic> json) {
    return SavedAccount(
      id: json['id'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String,
      role: json['role'] as String,
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'role': role,
      'accessToken': accessToken,
      'refreshToken': refreshToken,
    };
  }

  SavedAccount copyWith({
    String? accessToken,
    String? refreshToken,
  }) {
    return SavedAccount(
      id: id,
      name: name,
      phone: phone,
      role: role,
      accessToken: accessToken ?? this.accessToken,
      refreshToken: refreshToken ?? this.refreshToken,
    );
  }

  static List<SavedAccount> listFromJson(String jsonStr) {
    final list = jsonDecode(jsonStr) as List<dynamic>;
    return list
        .map((e) => SavedAccount.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  static String listToJson(List<SavedAccount> accounts) {
    return jsonEncode(accounts.map((a) => a.toJson()).toList());
  }
}
