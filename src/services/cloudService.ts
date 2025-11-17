import AWS from 'aws-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

/**
 * CloudService - AWS S3 integration for backup and sync
 * Handles cloud storage operations, backup scheduling, and remote sync
 */

export interface CloudConfig {
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  s3BucketName: string;
  maxBackupSize: number;
}

export interface BackupMetadata {
  id: string;
  timestamp: number;
  size: number;
  albums: number;
  photos: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  error?: string;
}

export interface SyncStatus {
  lastSyncTime?: number;
  syncInProgress: boolean;
  itemsSynced: number;
  itemsFailed: number;
  conflicts: Array<{
    itemId: string;
    localVersion: string;
    remoteVersion: string;
  }>;
}

export class CloudService extends EventEmitter {
  private s3Client: AWS.S3;
  private config: CloudConfig;
  private syncStatus: SyncStatus = {
    syncInProgress: false,
    itemsSynced: 0,
    itemsFailed: 0,
    conflicts: [],
  };
  private backups: Map<string, BackupMetadata> = new Map();
  private backupSchedule?: NodeJS.Timeout;
  private localDataPath: string = './data';

  constructor(config: CloudConfig) {
    super();
    this.config = config;

    // Initialize S3 client
    this.s3Client = new AWS.S3({
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
      region: config.awsRegion,
    });
  }

  /**
   * Initialize cloud service and verify S3 connection
   */
  async initialize(): Promise<void> {
    try {
      // Test S3 connection
      await this.s3Client.headBucket({ Bucket: this.config.s3BucketName })
        .promise();

      this.emit('initialized', {
        message: 'Cloud service initialized',
        timestamp: Date.now(),
      });

      // Load existing backups from S3
      await this.loadBackupsList();
    } catch (error) {
      this.emit('error', {
        message: 'Failed to initialize cloud service',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Start automatic backup schedule (daily)
   */
  startBackupSchedule(intervalMs: number = 86400000): void {
    // Clear existing schedule if any
    if (this.backupSchedule) {
      clearInterval(this.backupSchedule);
    }

    this.backupSchedule = setInterval(async () => {
      try {
        await this.createBackup();
      } catch (error) {
        this.emit('backup-error', error);
      }
    }, intervalMs);

    this.emit('schedule-started', { interval: intervalMs });
  }

  /**
   * Stop automatic backup schedule
   */
  stopBackupSchedule(): void {
    if (this.backupSchedule) {
      clearInterval(this.backupSchedule);
      this.backupSchedule = undefined;
      this.emit('schedule-stopped', {});
    }
  }

  /**
   * Create backup of local data to S3
   */
  async createBackup(): Promise<string> {
    const backupId = `backup_${Date.now()}`;
    const metadata: BackupMetadata = {
      id: backupId,
      timestamp: Date.now(),
      size: 0,
      albums: 0,
      photos: 0,
      status: 'pending',
    };

    this.backups.set(backupId, metadata);
    this.emit('backup-started', metadata);

    try {
      metadata.status = 'in-progress';

      // Read local data
      const albumsPath = path.join(this.localDataPath, 'albums.json');
      const photosPath = path.join(this.localDataPath, 'photos.json');

      const albumsData = fs.readFileSync(albumsPath, 'utf-8');
      const photosData = fs.readFileSync(photosPath, 'utf-8');

      const combinedData = {
        albums: JSON.parse(albumsData),
        photos: JSON.parse(photosData),
        timestamp: Date.now(),
        version: '1.0',
      };

      const backupContent = JSON.stringify(combinedData);
      const backupSize = Buffer.byteLength(backupContent);

      // Check size limit
      if (backupSize > this.config.maxBackupSize) {
        throw new Error(
          `Backup size ${backupSize} exceeds limit ${this.config.maxBackupSize}`
        );
      }

      // Upload to S3
      await this.s3Client
        .putObject({
          Bucket: this.config.s3BucketName,
          Key: `backups/${backupId}.json`,
          Body: backupContent,
          ContentType: 'application/json',
          ServerSideEncryption: 'AES256',
          Metadata: {
            'backup-timestamp': String(metadata.timestamp),
            'albums-count': String(combinedData.albums.length),
            'photos-count': String(combinedData.photos.length),
          },
        })
        .promise();

      // Update metadata
      metadata.status = 'completed';
      metadata.size = backupSize;
      metadata.albums = combinedData.albums.length;
      metadata.photos = combinedData.photos.length;

      // Create metadata file
      await this.s3Client
        .putObject({
          Bucket: this.config.s3BucketName,
          Key: `backups/${backupId}_metadata.json`,
          Body: JSON.stringify(metadata),
          ContentType: 'application/json',
        })
        .promise();

      this.emit('backup-completed', metadata);
      return backupId;
    } catch (error) {
      metadata.status = 'failed';
      metadata.error = error instanceof Error ? error.message : String(error);
      this.emit('backup-error', metadata);
      throw error;
    }
  }

  /**
   * Restore backup from S3
   */
  async restoreBackup(backupId: string): Promise<void> {
    try {
      this.emit('restore-started', { backupId });

      // Download backup from S3
      const backupObj = await this.s3Client
        .getObject({
          Bucket: this.config.s3BucketName,
          Key: `backups/${backupId}.json`,
        })
        .promise();

      const backupData = JSON.parse(backupObj.Body?.toString('utf-8') || '{}');

      // Ensure directories exist
      if (!fs.existsSync(this.localDataPath)) {
        fs.mkdirSync(this.localDataPath, { recursive: true });
      }

      // Write restored data
      fs.writeFileSync(
        path.join(this.localDataPath, 'albums.json'),
        JSON.stringify(backupData.albums, null, 2)
      );

      fs.writeFileSync(
        path.join(this.localDataPath, 'photos.json'),
        JSON.stringify(backupData.photos, null, 2)
      );

      this.emit('restore-completed', {
        backupId,
        albumsRestored: backupData.albums.length,
        photosRestored: backupData.photos.length,
      });
    } catch (error) {
      this.emit('restore-error', {
        backupId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Load list of backups from S3
   */
  async loadBackupsList(): Promise<BackupMetadata[]> {
    try {
      const response = await this.s3Client
        .listObjectsV2({
          Bucket: this.config.s3BucketName,
          Prefix: 'backups/',
          Suffix: '_metadata.json',
        })
        .promise();

      const backupsList: BackupMetadata[] = [];

      if (response.Contents) {
        for (const object of response.Contents) {
          const metadataObj = await this.s3Client
            .getObject({
              Bucket: this.config.s3BucketName,
              Key: object.Key || '',
            })
            .promise();

          const metadata: BackupMetadata = JSON.parse(
            metadataObj.Body?.toString('utf-8') || '{}'
          );

          this.backups.set(metadata.id, metadata);
          backupsList.push(metadata);
        }
      }

      return backupsList.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      this.emit('error', {
        message: 'Failed to load backups list',
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get list of all backups
   */
  getBackupsList(): BackupMetadata[] {
    return Array.from(this.backups.values()).sort(
      (a, b) => b.timestamp - a.timestamp
    );
  }

  /**
   * Delete backup from S3
   */
  async deleteBackup(backupId: string): Promise<void> {
    try {
      await Promise.all([
        this.s3Client
          .deleteObject({
            Bucket: this.config.s3BucketName,
            Key: `backups/${backupId}.json`,
          })
          .promise(),
        this.s3Client
          .deleteObject({
            Bucket: this.config.s3BucketName,
            Key: `backups/${backupId}_metadata.json`,
          })
          .promise(),
      ]);

      this.backups.delete(backupId);
      this.emit('backup-deleted', { backupId });
    } catch (error) {
      this.emit('error', {
        message: 'Failed to delete backup',
        backupId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Sync local changes to cloud
   */
  async syncToCloud(): Promise<SyncStatus> {
    if (this.syncStatus.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncStatus.syncInProgress = true;
    this.syncStatus.itemsSynced = 0;
    this.syncStatus.itemsFailed = 0;
    this.syncStatus.conflicts = [];

    this.emit('sync-started', {});

    try {
      // Read local changes
      const changesPath = path.join(this.localDataPath, 'changes.json');
      let changes = [];

      if (fs.existsSync(changesPath)) {
        changes = JSON.parse(fs.readFileSync(changesPath, 'utf-8'));
      }

      // Upload each change
      for (const change of changes) {
        try {
          await this.s3Client
            .putObject({
              Bucket: this.config.s3BucketName,
              Key: `changes/${change.id}.json`,
              Body: JSON.stringify(change),
              ContentType: 'application/json',
            })
            .promise();

          this.syncStatus.itemsSynced++;
        } catch (error) {
          this.syncStatus.itemsFailed++;
        }
      }

      // Clear changes after sync
      if (fs.existsSync(changesPath)) {
        fs.unlinkSync(changesPath);
      }

      this.syncStatus.syncInProgress = false;
      this.syncStatus.lastSyncTime = Date.now();

      this.emit('sync-completed', this.syncStatus);
      return this.syncStatus;
    } catch (error) {
      this.syncStatus.syncInProgress = false;
      this.emit('sync-error', error);
      throw error;
    }
  }

  /**
   * Sync from cloud to local
   */
  async syncFromCloud(): Promise<SyncStatus> {
    if (this.syncStatus.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncStatus.syncInProgress = true;
    this.syncStatus.itemsSynced = 0;
    this.syncStatus.itemsFailed = 0;

    this.emit('sync-started', {});

    try {
      // List remote changes
      const response = await this.s3Client
        .listObjectsV2({
          Bucket: this.config.s3BucketName,
          Prefix: 'changes/',
        })
        .promise();

      const changesPath = path.join(this.localDataPath, 'remote_changes.json');
      const remoteChanges = [];

      if (response.Contents) {
        for (const object of response.Contents) {
          const changeObj = await this.s3Client
            .getObject({
              Bucket: this.config.s3BucketName,
              Key: object.Key || '',
            })
            .promise();

          const change = JSON.parse(changeObj.Body?.toString('utf-8') || '{}');
          remoteChanges.push(change);
          this.syncStatus.itemsSynced++;
        }
      }

      // Write remote changes locally
      if (!fs.existsSync(this.localDataPath)) {
        fs.mkdirSync(this.localDataPath, { recursive: true });
      }

      fs.writeFileSync(
        changesPath,
        JSON.stringify(remoteChanges, null, 2)
      );

      this.syncStatus.syncInProgress = false;
      this.syncStatus.lastSyncTime = Date.now();

      this.emit('sync-completed', this.syncStatus);
      return this.syncStatus;
    } catch (error) {
      this.syncStatus.syncInProgress = false;
      this.emit('sync-error', error);
      throw error;
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Get cloud storage usage
   */
  async getStorageUsage(): Promise<{
    totalSize: number;
    backupSize: number;
    changeSize: number;
  }> {
    try {
      const backupsResponse = await this.s3Client
        .listObjectsV2({
          Bucket: this.config.s3BucketName,
          Prefix: 'backups/',
        })
        .promise();

      const changesResponse = await this.s3Client
        .listObjectsV2({
          Bucket: this.config.s3BucketName,
          Prefix: 'changes/',
        })
        .promise();

      const backupSize = (backupsResponse.Contents || []).reduce(
        (sum: number, obj: any) => sum + (obj.Size || 0),
        0
      );

      const changeSize = (changesResponse.Contents || []).reduce(
        (sum: number, obj: any) => sum + (obj.Size || 0),
        0
      );

      return {
        totalSize: backupSize + changeSize,
        backupSize,
        changeSize,
      };
    } catch (error) {
      this.emit('error', {
        message: 'Failed to get storage usage',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Cleanup old backups (retention policy)
   */
  async cleanupOldBackups(retentionDays: number = 30): Promise<number> {
    try {
      const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const [backupId, metadata] of this.backups.entries()) {
        if (metadata.timestamp < cutoffTime) {
          await this.deleteBackup(backupId);
          deletedCount++;
        }
      }

      this.emit('cleanup-completed', { deletedCount });
      return deletedCount;
    } catch (error) {
      this.emit('error', {
        message: 'Failed to cleanup old backups',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export default CloudService;
