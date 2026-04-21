import 'dart:io';
import 'package:dio/dio.dart';
import 'api_client.dart';

class FilesApi {
  final ApiClient _client;

  FilesApi(this._client);

  Future<FileUploadResult> uploadProofImage(File imageFile) async {
    final fileName = imageFile.path.split('/').last;
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(imageFile.path, filename: fileName),
      'fileType': 'PROOF',
    });

    final response = await _client.dio.post('/files/upload', data: formData);
    final data = response.data as Map<String, dynamic>;
    return FileUploadResult(
      fileKey: data['fileKey'] as String,
      fileUrl: data['fileUrl'] as String,
    );
  }
}

class FileUploadResult {
  final String fileKey;
  final String fileUrl;

  FileUploadResult({required this.fileKey, required this.fileUrl});
}
