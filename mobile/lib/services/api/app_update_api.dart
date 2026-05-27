import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'api_client.dart';

class AppUpdateInfo {
  final bool updateAvailable;
  final bool forceUpdate;
  final String? latestVersion;
  final int? latestBuild;
  final int? minSupportedBuild;
  final String? title;
  final String? message;
  final String? storeUrl;
  final List<String>? releaseNotes;

  const AppUpdateInfo({
    required this.updateAvailable,
    required this.forceUpdate,
    this.latestVersion,
    this.latestBuild,
    this.minSupportedBuild,
    this.title,
    this.message,
    this.storeUrl,
    this.releaseNotes,
  });

  factory AppUpdateInfo.noUpdate() => const AppUpdateInfo(
        updateAvailable: false,
        forceUpdate: false,
      );

  factory AppUpdateInfo.fromJson(Map<String, dynamic> j) => AppUpdateInfo(
        updateAvailable: j['updateAvailable'] as bool? ?? false,
        forceUpdate: j['forceUpdate'] as bool? ?? false,
        latestVersion: j['latestVersion'] as String?,
        latestBuild: j['latestBuild'] as int?,
        minSupportedBuild: j['minSupportedBuild'] as int?,
        title: j['title'] as String?,
        message: j['message'] as String?,
        storeUrl: j['storeUrl'] as String?,
        releaseNotes: (j['releaseNotes'] as List<dynamic>?)?.cast<String>(),
      );
}

class AppUpdateApi {
  final ApiClient _client;

  AppUpdateApi(this._client);

  Future<AppUpdateInfo> checkUpdate({
    required String platform,
    required String appType,
  }) async {
    try {
      final info = await PackageInfo.fromPlatform();
      final buildNumber = int.tryParse(info.buildNumber) ?? 1;

      final response = await _client.dio.post(
        '/app-updates/check',
        data: {
          'platform': platform,
          'appType': appType,
          'versionName': info.version,
          'buildNumber': buildNumber,
        },
      );

      return AppUpdateInfo.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      debugPrint('[AppUpdateApi] checkUpdate failed: $e');
      return AppUpdateInfo.noUpdate();
    }
  }
}
