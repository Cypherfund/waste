import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';
import 'api_client.dart';

class FilesApi {
  final ApiClient _client;

  FilesApi(this._client);

  Future<FileUploadResult> uploadProofImage(XFile imageFile) async {
    final fileName = imageFile.name.isNotEmpty
        ? imageFile.name
        : imageFile.path.split('/').last;
    final bytes = await imageFile.readAsBytes();
    final formData = FormData.fromMap({
      'file': MultipartFile.fromBytes(bytes, filename: fileName),
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
