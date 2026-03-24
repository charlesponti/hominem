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

export interface PreparedUpload {
  id: string;
  key: string;
  originalName: string;
  mimetype: string;
  size: number;
  uploadUrl: string;
  headers: Record<string, string>;
  url: string;
  uploadedAt: Date;
  expiresAt: Date;
}
