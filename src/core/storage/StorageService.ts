import { AppError } from "@/core/errors";
import { logger } from "@/core/logging";

export type FileCategory = "avatar" | "resource" | "message_attachment" | "institution_document" | "news_image";

export interface FileUpload {
  fileName: string;
  fileType: string;
  fileSize: number;
  buffer: ArrayBuffer;
  category: FileCategory;
}

export interface FileUploadResult {
  url: string;
  path: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export interface StorageAdapter {
  upload(file: FileUpload): Promise<FileUploadResult>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}

export const ALLOWED_FILE_TYPES: Record<FileCategory, string[]> = {
  avatar: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],
  resource: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
  ],
  message_attachment: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  institution_document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ],
  news_image: ["image/jpeg", "image/png", "image/webp"],
};

export const MAX_FILE_SIZES: Record<FileCategory, number> = {
  avatar: 2 * 1024 * 1024,
  resource: 50 * 1024 * 1024,
  message_attachment: 10 * 1024 * 1024,
  institution_document: 100 * 1024 * 1024,
  news_image: 5 * 1024 * 1024,
};

export class StorageService {
  private adapter: StorageAdapter;

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter;
  }

  private validate(file: FileUpload): void {
    const allowedTypes = ALLOWED_FILE_TYPES[file.category];
    const maxSize = MAX_FILE_SIZES[file.category];

    if (!allowedTypes.includes(file.fileType)) {
      throw AppError.validation(
        `Invalid file type "${file.fileType}" for category "${file.category}". Allowed: ${allowedTypes.join(", ")}`,
      );
    }

    if (file.fileSize > maxSize) {
      throw AppError.validation(
        `File too large. Maximum size for "${file.category}" is ${Math.round(maxSize / 1024 / 1024)}MB.`,
        { maxSizeMB: Math.round(maxSize / 1024 / 1024) },
      );
    }
  }

  async upload(file: FileUpload): Promise<FileUploadResult> {
    this.validate(file);
    try {
      const result = await this.adapter.upload(file);
      logger.info("File uploaded", {
        category: file.category,
        fileName: file.fileName,
        size: file.fileSize,
      });
      return result;
    } catch (err) {
      logger.error("File upload failed", {
        category: file.category,
        fileName: file.fileName,
        error: String(err),
      });
      throw err;
    }
  }

  async delete(path: string): Promise<void> {
    try {
      await this.adapter.delete(path);
      logger.info("File deleted", { path });
    } catch (err) {
      logger.error("File deletion failed", { path, error: String(err) });
      throw AppError.internal("Failed to delete file.");
    }
  }

  getUrl(path: string): string {
    return this.adapter.getUrl(path);
  }
}
