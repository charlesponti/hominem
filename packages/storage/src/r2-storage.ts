import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  buildStoredFileName,
  formatTimestampForFileName,
  getExtensionFromMimeType,
  getFileExtension,
  sanitizeFileName,
} from '@hominem/utils/files';

import { env } from './env';
import { StorageServiceError } from './errors';
import type { FileObject, PreparedUpload, StorageOptions, StoredFile } from './types';
import { isSupportedUploadMimeType } from './upload-policy';

export type StorageCategory = 'csvs' | 'chats' | 'places' | 'images' | 'documents' | 'imports';

const IS_TEST_MODE = process.env.NODE_ENV === 'test';

function resolveFileExtension(filename: string, mimetype: string): string {
  const ext = getFileExtension(filename);
  return ext ? `.${ext}` : getExtensionFromMimeType(mimetype);
}

function getIsLocalStorageEndpoint(endpoint: string): boolean {
  const hostname = new URL(endpoint).hostname;
  return ['localhost', '127.0.0.1', '::1', 'host.docker.internal', 'minio'].includes(hostname);
}

type StorageConnectionConfig = {
  endpoint: string;
  region: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl?: string;
  forcePathStyle: boolean;
};

function getStorageConnectionConfig(): StorageConnectionConfig {
  const isLocalEndpoint = getIsLocalStorageEndpoint(env.R2_ENDPOINT);

  return {
    endpoint: env.R2_ENDPOINT,
    region: isLocalEndpoint ? 'us-east-1' : 'auto',
    bucketName: env.R2_BUCKET_NAME,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    publicUrl: env.R2_PUBLIC_URL,
    forcePathStyle: isLocalEndpoint,
  };
}

function getBucketAccessError(bucketName: string, error: unknown): StorageServiceError {
  if (!(error instanceof Error)) {
    return new StorageServiceError('storage.bucket.access_unknown', {
      bucketName,
      causeType: typeof error,
    });
  }

  const errorMessage = error.message.toLowerCase();

  if (
    errorMessage.includes('credential access key has length') ||
    errorMessage.includes('signature') ||
    errorMessage.includes('invalidaccesskeyid') ||
    errorMessage.includes('authorizationheadermalformed')
  ) {
    return new StorageServiceError('storage.credentials.invalid', {
      bucketName,
      reason: error.message,
    });
  }

  if (
    errorMessage.includes('access denied') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('forbidden')
  ) {
    return new StorageServiceError('storage.bucket.access_denied', {
      bucketName,
      reason: error.message,
    });
  }

  if (errorMessage.includes('no such bucket') || errorMessage.includes('not found')) {
    return new StorageServiceError('storage.bucket.missing', {
      bucketName,
      reason: error.message,
    });
  }

  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('enotfound') ||
    errorMessage.includes('network')
  ) {
    return new StorageServiceError('storage.network.unreachable', {
      bucketName,
      reason: error.message,
    });
  }

  return new StorageServiceError('storage.bucket.access_unknown', {
    bucketName,
    reason: error.message,
    name: error.name,
  });
}

class InMemoryStorageBackend {
  bucketName = 'hominem-test';
  isPublic = false;
  userScoped = true;
  files: Map<string, Buffer> = new Map();
  maxFileSize: number;
  category: StorageCategory;
  pendingUploads: Map<string, { buffer?: Buffer; mimetype: string; size: number }> = new Map();
  preparedUploadKeys: Map<string, { key: string; userId: string }> = new Map();

  constructor(category: StorageCategory, options?: StorageOptions) {
    this.category = category;
    this.maxFileSize = options?.maxFileSize || 50 * 1024 * 1024;
  }

  async storeImmutableObject(userId: string, contentHash: string, buffer: Buffer): Promise<string> {
    const key = `${this.getKey(userId, 'sha256')}/${contentHash}`;
    if (!this.files.has(key)) {
      this.files.set(key, buffer);
    }
    return key;
  }

  markUploadPending(filePath: string, mimetype: string, size: number): void {
    this.pendingUploads.set(filePath, { mimetype, size });
  }

  markPreparedUpload(fileId: string, key: string, userId: string): void {
    this.preparedUploadKeys.set(fileId, { key, userId });
  }

  getPreparedUploadInfo(fileId: string): { key: string; userId: string } | undefined {
    return this.preparedUploadKeys.get(fileId);
  }

  completePendingUpload(filePath: string, buffer: Buffer): void {
    this.files.set(filePath, buffer);
    this.pendingUploads.delete(filePath);
  }

  getKey(userId: string, filename: string): string {
    return `users/${userId}/${this.category}/${filename}`;
  }

  createStoredName(id: string, filename: string, extension: string): string {
    return buildStoredFileName(id, filename, extension);
  }

  isValidFileType(mimetype: string): boolean {
    return isSupportedUploadMimeType(mimetype);
  }

  async ensureBucket(): Promise<void> {
    // No-op for in-memory backend
  }

  async createPreparedUpload(
    input: {
      originalName: string;
      mimetype: string;
      size: number;
      filename?: string;
    },
    userId: string,
    expiresIn = 900,
  ): Promise<PreparedUpload> {
    if (input.size > this.maxFileSize) {
      throw new Error(`File size exceeds maximum limit of ${this.maxFileSize} bytes`);
    }

    if (!this.isValidFileType(input.mimetype)) {
      throw new Error(`Unsupported file type: ${input.mimetype}`);
    }

    const id = crypto.randomUUID();
    const originalName = input.originalName || input.filename || 'file';
    const extension = resolveFileExtension(originalName, input.mimetype);
    const storedName = input.filename
      ? this.createStoredName(id, input.filename, extension)
      : `${id}${extension}`;
    const key = this.getKey(userId, storedName);

    this.markPreparedUpload(id, key, userId);

    return {
      id,
      key,
      originalName,
      mimetype: input.mimetype,
      size: input.size,
      uploadUrl: `/api/files/upload-bytes/${id}`,
      headers: {
        'content-type': input.mimetype,
      },
      url: `/files/${id}`,
      uploadedAt: new Date(),
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }

  async storeFile(
    buffer: Buffer,
    mimetype: string,
    userId: string,
    options?: {
      filename?: string;
      originalName?: string;
    },
  ): Promise<StoredFile> {
    if (buffer.byteLength > this.maxFileSize) {
      throw new Error(`File size exceeds maximum limit of ${this.maxFileSize} bytes`);
    }

    const originalName = options?.originalName || options?.filename || 'file';
    const preparedUpload = await this.createPreparedUpload(
      {
        originalName,
        mimetype,
        size: buffer.byteLength,
        ...(options?.filename ? { filename: options.filename } : {}),
      },
      userId,
      3600,
    );

    this.files.set(preparedUpload.key, buffer);
    this.pendingUploads.delete(preparedUpload.key);

    return {
      id: preparedUpload.id,
      originalName: preparedUpload.originalName,
      filename: preparedUpload.key,
      mimetype,
      size: buffer.byteLength,
      url: preparedUpload.url,
      uploadedAt: preparedUpload.uploadedAt,
    };
  }

  async getFile(fileId: string, userId: string): Promise<ArrayBuffer | null> {
    const files = await this.listUserFiles(userId);
    const file = files.find((f) => f.name.startsWith(fileId));

    if (!file) {
      return null;
    }

    const key = this.getKey(userId, file.name);
    const buffer = this.files.get(key);
    return buffer
      ? (buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength,
        ) as ArrayBuffer)
      : null;
  }

  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    const files = await this.listUserFiles(userId);
    const file = files.find((f) => f.name.startsWith(fileId));

    if (!file) {
      return false;
    }

    const key = this.getKey(userId, file.name);
    return this.files.delete(key);
  }

  async getFileUrl(fileId: string, userId: string): Promise<string | null> {
    const files = await this.listUserFiles(userId);
    const file = files.find((f) => f.name.startsWith(fileId));

    if (!file) {
      return null;
    }

    return `/files/${fileId}`;
  }

  async getSignedUrl(filePath: string): Promise<string> {
    return `/files/${filePath}`;
  }

  async fileExists(filePath: string): Promise<boolean> {
    return this.files.has(filePath);
  }

  async getFileByPath(filePath: string): Promise<Buffer | null> {
    return this.files.get(filePath) || null;
  }

  getPublicUrlForPath(filePath: string): string {
    return `/files/${filePath}`;
  }

  getPublicUrl(filePath: string): string {
    return this.getPublicUrlForPath(filePath);
  }

  isOwnedFilePath(userId: string, filePath: string): boolean {
    return filePath.startsWith(`users/${userId}/${this.category}/`);
  }

  async listUserFiles(userId: string): Promise<FileObject[]> {
    const prefix = `users/${userId}/${this.category}/`;
    const userFiles: FileObject[] = [];

    for (const [key, buffer] of this.files.entries()) {
      if (key.startsWith(prefix)) {
        const name = key.replace(prefix, '');
        userFiles.push({ name, size: buffer.byteLength });
      }
    }

    return userFiles;
  }

  async uploadCsvFile(
    fileName: string,
    fileContent: Buffer | string,
    userId: string,
  ): Promise<string> {
    const filename = `${formatTimestampForFileName()}_${sanitizeFileName(fileName)}`;
    const key = this.getKey(userId, filename);

    const buffer = typeof fileContent === 'string' ? Buffer.from(fileContent) : fileContent;
    this.files.set(key, buffer);
    return key;
  }

  async downloadCsvFile(filePath: string): Promise<string> {
    const buffer = this.files.get(filePath);
    if (!buffer) {
      throw new Error('File not found');
    }
    return buffer.toString('utf-8');
  }

  async downloadCsvFileAsBuffer(filePath: string): Promise<Buffer> {
    const buffer = this.files.get(filePath);
    if (!buffer) {
      throw new Error('File not found');
    }
    return buffer;
  }
}

export class R2StorageService {
  private _client?: S3Client;
  private readonly storageConfig: StorageConnectionConfig;
  bucketName!: string;
  category!: StorageCategory;
  maxFileSize!: number;
  isPublic!: boolean;
  userScoped!: boolean;
  preparedUploadKeys: Map<string, { key: string; userId: string }> = new Map();

  constructor(category: StorageCategory, options?: StorageOptions) {
    this.category = category;
    this.maxFileSize = options?.maxFileSize || 50 * 1024 * 1024;
    this.isPublic = options?.isPublic ?? false;
    this.userScoped = category !== 'places';
    this.storageConfig = getStorageConnectionConfig();
    this.bucketName = this.storageConfig.bucketName;
  }

  get client(): S3Client {
    if (!this._client) {
      this._client = new S3Client({
        region: this.storageConfig.region,
        endpoint: this.storageConfig.endpoint,
        credentials: {
          accessKeyId: this.storageConfig.accessKeyId,
          secretAccessKey: this.storageConfig.secretAccessKey,
        },
        forcePathStyle: this.storageConfig.forcePathStyle,
      });
    }
    return this._client;
  }

  getKey(userId: string, filename: string): string {
    if (this.userScoped) {
      return `users/${userId}/${this.category}/${filename}`;
    }
    return `places/place/${filename}`;
  }

  async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
    } catch (error) {
      throw getBucketAccessError(this.bucketName, error);
    }
  }

  async uploadCsvFile(
    fileName: string,
    fileContent: Buffer | string,
    userId: string,
  ): Promise<string> {
    await this.ensureBucket();

    const filename = `${formatTimestampForFileName()}_${sanitizeFileName(fileName)}`;
    const key = this.getKey(userId, filename);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: fileContent,
      ContentType: 'text/csv',
    });

    await this.client.send(command);
    return key;
  }

  async storeFile(
    buffer: Buffer,
    mimetype: string,
    userId: string,
    options?: {
      filename?: string;
      originalName?: string;
    },
  ): Promise<StoredFile> {
    if (buffer.byteLength > this.maxFileSize) {
      throw new Error(`File size exceeds maximum limit of ${this.maxFileSize} bytes`);
    }

    await this.ensureBucket();

    const originalName = options?.originalName || options?.filename || 'file';
    const preparedUpload = await this.createPreparedUpload(
      {
        originalName,
        mimetype,
        size: buffer.byteLength,
        ...(options?.filename ? { filename: options.filename } : {}),
      },
      userId,
      3600,
    );

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: preparedUpload.key,
      Body: buffer,
      ContentType: mimetype,
    });

    await this.client.send(command);

    return {
      id: preparedUpload.id,
      originalName: preparedUpload.originalName,
      filename: preparedUpload.key,
      mimetype,
      size: buffer.byteLength,
      url: preparedUpload.url,
      uploadedAt: preparedUpload.uploadedAt,
    };
  }

  async createPreparedUpload(
    input: {
      originalName: string;
      mimetype: string;
      size: number;
      filename?: string;
    },
    userId: string,
    expiresIn = 900,
  ): Promise<PreparedUpload> {
    if (input.size > this.maxFileSize) {
      throw new Error(`File size exceeds maximum limit of ${this.maxFileSize} bytes`);
    }

    if (!this.isValidFileType(input.mimetype)) {
      throw new Error(`Unsupported file type: ${input.mimetype}`);
    }

    await this.ensureBucket();

    const id = crypto.randomUUID();
    const originalName = input.originalName || input.filename || 'file';
    const extension = resolveFileExtension(originalName, input.mimetype);
    const storedName = input.filename
      ? this.createStoredName(id, input.filename, extension)
      : `${id}${extension}`;
    const key = this.getKey(userId, storedName);

    this.markPreparedUpload(id, key, userId);

    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: input.mimetype,
        ContentLength: input.size,
      }),
      { expiresIn },
    );

    return {
      id,
      key,
      originalName,
      mimetype: input.mimetype,
      size: input.size,
      uploadUrl,
      headers: {
        'content-type': input.mimetype,
      },
      url: this.getPublicUrl(key),
      uploadedAt: new Date(),
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }

  async downloadCsvFile(filePath: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
    });

    const response = await this.client.send(command);

    if (!response.Body) {
      throw new Error('No file data received');
    }

    return await response.Body.transformToString();
  }

  async downloadCsvFileAsBuffer(filePath: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
    });

    const response = await this.client.send(command);

    if (!response.Body) {
      throw new Error('No file data received');
    }

    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  async getFile(fileId: string, userId: string): Promise<ArrayBuffer | null> {
    try {
      const files = await this.listUserFiles(userId);
      const file = files.find((f) => f.name.startsWith(fileId));

      if (!file) {
        return null;
      }

      const key = this.getKey(userId, file.name);
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        return null;
      }

      const bytes = await response.Body.transformToByteArray();
      return bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
    } catch {
      return null;
    }
  }

  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    try {
      const files = await this.listUserFiles(userId);
      const file = files.find((f) => f.name.startsWith(fileId));

      if (!file) {
        return false;
      }

      const key = this.getKey(userId, file.name);
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async getFileUrl(fileId: string, userId: string): Promise<string | null> {
    try {
      const files = await this.listUserFiles(userId);
      const file = files.find((f) => f.name.startsWith(fileId));

      if (!file) {
        return null;
      }

      const key = this.getKey(userId, file.name);
      return this.getPublicUrl(key);
    } catch {
      return null;
    }
  }

  async getSignedUrl(filePath: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: filePath,
        }),
      );

      return true;
    } catch {
      return false;
    }
  }

  async getFileByPath(filePath: string): Promise<Buffer | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: filePath,
        }),
      );

      if (!response.Body) {
        return null;
      }

      const bytes = await response.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch {
      return null;
    }
  }

  getPublicUrlForPath(filePath: string): string {
    return this.getPublicUrl(filePath);
  }

  isOwnedFilePath(userId: string, filePath: string): boolean {
    return filePath.startsWith(`users/${userId}/${this.category}/`);
  }

  async listUserFiles(userId: string): Promise<FileObject[]> {
    const prefix = `users/${userId}/${this.category}/`;
    const client = this.client;

    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix,
    });

    const response = await client.send(command);

    return (response.Contents || []).map((obj): FileObject => {
      const name = obj.Key?.replace(prefix, '') || '';
      const fileObj: FileObject = { name, size: obj.Size ?? 0 };
      if (obj.LastModified) {
        fileObj.lastModified = obj.LastModified;
      }
      return fileObj;
    });
  }

  getPublicUrl(key: string): string {
    const endpoint = this.storageConfig.endpoint;
    const bucket = this.storageConfig.bucketName;
    const publicUrl = this.storageConfig.publicUrl;
    if (publicUrl) {
      return `${publicUrl.replace(/\/$/, '')}/${bucket}/${key}`;
    }

    const url = new URL(endpoint);
    if (this.storageConfig.forcePathStyle) {
      return `${url.protocol}//${url.host}/${bucket}/${key}`;
    }
    return `${url.protocol}//${bucket}.${url.host}/${key}`;
  }

  createStoredName(id: string, filename: string, extension: string): string {
    return buildStoredFileName(id, filename, extension);
  }

  isValidFileType(mimetype: string): boolean {
    return isSupportedUploadMimeType(mimetype);
  }

  markPreparedUpload(fileId: string, key: string, userId: string): void {
    this.preparedUploadKeys.set(fileId, { key, userId });
  }

  getPreparedUploadInfo(fileId: string): { key: string; userId: string } | undefined {
    return this.preparedUploadKeys.get(fileId);
  }

  /**
   * Stores a private, content-addressed import object. Re-importing identical
   * bytes returns the same key and never overwrites a distinct artifact.
   */
  async storeImmutableObject(userId: string, contentHash: string, buffer: Buffer): Promise<string> {
    if (!/^[a-f0-9]{64}$/i.test(contentHash)) {
      throw new Error('contentHash must be a SHA-256 hex digest');
    }

    await this.ensureBucket();
    const key = `${this.getKey(userId, 'sha256')}/${contentHash.toLowerCase()}`;
    if (await this.fileExists(key)) {
      return key;
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: 'application/octet-stream',
      }),
    );
    return key;
  }
}

type StorageService = R2StorageService | InMemoryStorageBackend;

function createStorageService(category: StorageCategory, options: StorageOptions): StorageService {
  return IS_TEST_MODE
    ? new InMemoryStorageBackend(category, options)
    : new R2StorageService(category, options);
}

export const csvStorageService = createStorageService('csvs', {
  maxFileSize: 50 * 1024 * 1024,
  isPublic: false,
});

export const fileStorageService = createStorageService('chats', {
  maxFileSize: 10 * 1024 * 1024,
  isPublic: true,
});

export const placeImagesStorageService = createStorageService('places', {
  maxFileSize: 10 * 1024 * 1024,
  isPublic: true,
});

export const importStorageService = createStorageService('imports', {
  maxFileSize: 1024 * 1024 * 1024,
  isPublic: false,
});

export const documentStorageService = createStorageService('documents', {
  maxFileSize: 25 * 1024 * 1024,
  isPublic: false,
});

export const imageStorageService = createStorageService('images', {
  maxFileSize: 10 * 1024 * 1024,
  isPublic: true,
});
