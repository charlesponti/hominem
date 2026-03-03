export interface StoredFile {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

export interface StorageOptions {
  maxFileSize?: number;
  isPublic?: boolean;
}

export interface FileObject {
  name: string;
  size: number;
  lastModified?: Date;
}
