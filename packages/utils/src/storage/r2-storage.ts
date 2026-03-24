import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CreateBucketCommand,
  HeadBucketCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { isSupportedChatUploadMimeType } from '../upload';

import * as Types from './types';

export type StoredFile = Types.StoredFile;
export type StorageOptions = Types.StorageOptions;
export type FileObject = Types.FileObject;
export type PreparedUpload = Types.PreparedUpload;

export type StorageCategory = 'csvs' | 'chats' | 'places';

export class R2StorageService {
  private client: S3Client;
  private bucketName: string;
  private category: StorageCategory;
  private maxFileSize: number;
  private isPublic: boolean;
  private userScoped: boolean;

  constructor(category: StorageCategory, options?: StorageOptions) {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'Missing R2 credentials. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables.',
      );
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.bucketName = process.env.R2_BUCKET_NAME || 'hominem-storage';
    this.category = category;
    this.maxFileSize = options?.maxFileSize || 50 * 1024 * 1024;
    this.isPublic = options?.isPublic ?? false;
    this.userScoped = category !== 'places';
  }

  private getKey(userId: string, filename: string): string {
    if (this.userScoped) {
      return `users/${userId}/${this.category}/${filename}`;
    }
    return `places/place/${filename}`;
  }

  async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
    } catch {
      await this.client.send(
        new CreateBucketCommand({
          Bucket: this.bucketName,
          ACL: this.isPublic ? 'public-read' : 'private',
        }),
      );
    }
  }

  async uploadCsvFile(
    fileName: string,
    fileContent: Buffer | string,
    userId: string,
  ): Promise<string> {
    await this.ensureBucket();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${sanitizedFileName}`;
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
    const extension = this.getFileExtension(originalName, input.mimetype);
    const storedName = input.filename
      ? this.createStoredName(id, input.filename, extension)
      : `${id}${extension}`;
    const key = this.getKey(userId, storedName);
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
      return bytes.buffer as ArrayBuffer;
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

    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix,
    });

    const response = await this.client.send(command);

    return (response.Contents || []).map((obj): FileObject => {
      const name = obj.Key?.replace(prefix, '') || '';
      const fileObj: FileObject = { name, size: obj.Size ?? 0 };
      if (obj.LastModified) {
        fileObj.lastModified = obj.LastModified;
      }
      return fileObj;
    });
  }

  private getPublicUrl(key: string): string {
    const endpoint = process.env.R2_ENDPOINT;
    const bucket = this.bucketName;
    if (!endpoint) {
      throw new Error('R2_ENDPOINT not configured');
    }
    const url = new URL(endpoint);
    return `${url.protocol}//${bucket}.${url.host}/${key}`;
  }

  private getFileExtension(filename: string, mimetype: string): string {
    const dotIndex = filename.lastIndexOf('.');
    if (dotIndex !== -1) {
      return filename.substring(dotIndex);
    }

    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'application/pdf': '.pdf',
      'text/plain': '.txt',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/msword': '.doc',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'text/csv': '.csv',
      'application/csv': '.csv',
    };

    return mimeToExt[mimetype] || '';
  }

  private createStoredName(id: string, filename: string, extension: string): string {
    const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const withExtension = sanitized.endsWith(extension) ? sanitized : `${sanitized}${extension}`;

    return `${id}-${withExtension}`;
  }

  isValidFileType(mimetype: string): boolean {
    return isSupportedChatUploadMimeType(mimetype);
  }
}

const createCsvStorageService = () =>
  new R2StorageService('csvs', {
    maxFileSize: 50 * 1024 * 1024,
    isPublic: false,
  });

const createFileStorageService = () =>
  new R2StorageService('chats', {
    maxFileSize: 10 * 1024 * 1024,
    isPublic: true,
  });

const createPlaceImagesStorageService = () =>
  new R2StorageService('places', {
    maxFileSize: 10 * 1024 * 1024,
    isPublic: true,
  });

export const csvStorageService: R2StorageService = new Proxy({} as R2StorageService, {
  get(target, prop) {
    void target;
    const service = createCsvStorageService();
    Object.assign(csvStorageService, service);
    return Reflect.get(csvStorageService, prop);
  },
});

export const fileStorageService: R2StorageService = new Proxy({} as R2StorageService, {
  get(target, prop) {
    void target;
    const service = createFileStorageService();
    Object.assign(fileStorageService, service);
    return Reflect.get(fileStorageService, prop);
  },
});

export const placeImagesStorageService: R2StorageService = new Proxy({} as R2StorageService, {
  get(target, prop) {
    void target;
    const service = createPlaceImagesStorageService();
    Object.assign(placeImagesStorageService, service);
    return Reflect.get(placeImagesStorageService, prop);
  },
});
