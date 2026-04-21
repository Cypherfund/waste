import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as p;
import 'package:uuid/uuid.dart';

enum QueueAction { CREATE_JOB, COMPLETE_JOB, RATE_JOB, LOCATION_UPDATE }

enum QueueStatus { PENDING, SYNCING, SYNCED, FAILED }

class QueuedItem {
  final String id;
  final QueueAction action;
  final String? jobId;
  final Map<String, dynamic> data;
  final QueueStatus status;
  final int retryCount;
  final String? errorMessage;
  final DateTime createdAt;
  final DateTime updatedAt;

  QueuedItem({
    required this.id,
    required this.action,
    this.jobId,
    required this.data,
    required this.status,
    this.retryCount = 0,
    this.errorMessage,
    required this.createdAt,
    required this.updatedAt,
  });

  factory QueuedItem.fromMap(Map<String, dynamic> map) {
    return QueuedItem(
      id: map['id'] as String,
      action: QueueAction.values.firstWhere(
        (e) => e.name == map['action'],
        orElse: () => QueueAction.CREATE_JOB,
      ),
      jobId: map['job_id'] as String?,
      data: jsonDecode(map['data'] as String) as Map<String, dynamic>,
      status: QueueStatus.values.firstWhere(
        (e) => e.name == map['status'],
        orElse: () => QueueStatus.PENDING,
      ),
      retryCount: map['retry_count'] as int? ?? 0,
      errorMessage: map['error_message'] as String?,
      createdAt: DateTime.parse(map['created_at'] as String),
      updatedAt: DateTime.parse(map['updated_at'] as String),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'action': action.name,
      'job_id': jobId,
      'data': jsonEncode(data),
      'status': status.name,
      'retry_count': retryCount,
      'error_message': errorMessage,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  QueuedItem copyWith({
    QueueStatus? status,
    int? retryCount,
    String? errorMessage,
    DateTime? updatedAt,
  }) {
    return QueuedItem(
      id: id,
      action: action,
      jobId: jobId,
      data: data,
      status: status ?? this.status,
      retryCount: retryCount ?? this.retryCount,
      errorMessage: errorMessage ?? this.errorMessage,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

class OfflineQueueService {
  static const String _dbName = 'wastewise_queue.db';
  static const String _tableName = 'actions_queue';
  static const int _dbVersion = 1;
  static const int maxRetries = 3;

  Database? _db;
  final _uuid = const Uuid();

  Future<Database> get database async {
    _db ??= await _initDb();
    return _db!;
  }

  Future<Database> _initDb() async {
    final dbPath = await getDatabasesPath();
    final path = p.join(dbPath, _dbName);

    return openDatabase(
      path,
      version: _dbVersion,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE $_tableName (
            id TEXT PRIMARY KEY,
            action TEXT NOT NULL,
            job_id TEXT,
            data TEXT NOT NULL DEFAULT '{}',
            status TEXT NOT NULL DEFAULT 'PENDING',
            retry_count INTEGER NOT NULL DEFAULT 0,
            error_message TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
        ''');

        await db.execute('''
          CREATE INDEX idx_queue_status ON $_tableName (status)
        ''');

        await db.execute('''
          CREATE INDEX idx_queue_created ON $_tableName (created_at)
        ''');
      },
    );
  }

  Future<QueuedItem> enqueue({
    required QueueAction action,
    String? jobId,
    required Map<String, dynamic> data,
  }) async {
    final db = await database;
    final now = DateTime.now();
    final item = QueuedItem(
      id: _uuid.v4(),
      action: action,
      jobId: jobId,
      data: data,
      status: QueueStatus.PENDING,
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    );

    await db.insert(_tableName, item.toMap());
    debugPrint('[Queue] Enqueued: ${action.name} jobId=$jobId');
    return item;
  }

  Future<List<QueuedItem>> getPendingItems() async {
    final db = await database;
    final results = await db.query(
      _tableName,
      where: 'status = ? OR (status = ? AND retry_count < ?)',
      whereArgs: [QueueStatus.PENDING.name, QueueStatus.FAILED.name, maxRetries],
      orderBy: 'created_at ASC',
    );
    return results.map((m) => QueuedItem.fromMap(m)).toList();
  }

  Future<List<QueuedItem>> getAllItems() async {
    final db = await database;
    final results = await db.query(
      _tableName,
      orderBy: 'created_at DESC',
      limit: 50,
    );
    return results.map((m) => QueuedItem.fromMap(m)).toList();
  }

  Future<int> getPendingCount() async {
    final db = await database;
    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM $_tableName WHERE status = ? OR (status = ? AND retry_count < ?)',
      [QueueStatus.PENDING.name, QueueStatus.FAILED.name, maxRetries],
    );
    return Sqflite.firstIntValue(result) ?? 0;
  }

  Future<void> markSyncing(String id) async {
    final db = await database;
    await db.update(
      _tableName,
      {
        'status': QueueStatus.SYNCING.name,
        'updated_at': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> markSynced(String id) async {
    final db = await database;
    await db.update(
      _tableName,
      {
        'status': QueueStatus.SYNCED.name,
        'updated_at': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [id],
    );
    debugPrint('[Queue] Synced: $id');
  }

  Future<void> markFailed(String id, String error) async {
    final db = await database;
    await db.rawUpdate(
      'UPDATE $_tableName SET status = ?, error_message = ?, retry_count = retry_count + 1, updated_at = ? WHERE id = ?',
      [QueueStatus.FAILED.name, error, DateTime.now().toIso8601String(), id],
    );
    debugPrint('[Queue] Failed: $id — $error');
  }

  Future<void> deleteItem(String id) async {
    final db = await database;
    await db.delete(_tableName, where: 'id = ?', whereArgs: [id]);
  }

  Future<void> clearSynced() async {
    final db = await database;
    await db.delete(
      _tableName,
      where: 'status = ?',
      whereArgs: [QueueStatus.SYNCED.name],
    );
  }

  Future<void> resetFailed() async {
    final db = await database;
    await db.update(
      _tableName,
      {
        'status': QueueStatus.PENDING.name,
        'error_message': null,
        'updated_at': DateTime.now().toIso8601String(),
      },
      where: 'status = ? AND retry_count < ?',
      whereArgs: [QueueStatus.FAILED.name, maxRetries],
    );
  }

  Future<void> close() async {
    await _db?.close();
    _db = null;
  }
}
