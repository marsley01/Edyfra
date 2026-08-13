import { createAdminClient } from "@/utils/supabase/admin";

export const STORAGE_BUCKETS = {
  kyc: "edyfra",
  resources: "resources",
  avatars: "avatars",
  sessionFiles: "session-files",
  institutionLogos: "institution-logos",
} as const;

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function sanitizeFileExtension(filename: string): string {
  const parts = filename.split(".");
  if (parts.length <= 1) return "bin";
  const ext = parts.pop() || "bin";
  return ext.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "bin";
}

export function sanitizeFileName(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.\-_]/g, "_")
    .replace(/\.+/g, ".")
    .substring(0, 100);
}

export interface FileValidationOptions {
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  maxSizeBytes?: number;
}

export function validateUploadFile(
  file: File,
  options: FileValidationOptions
): { valid: boolean; error?: string } {
  if (!file || typeof file.size !== "number") {
    return { valid: false, error: "Invalid or missing file." };
  }

  if (options.maxSizeBytes && file.size > options.maxSizeBytes) {
    const maxMb = Math.round(options.maxSizeBytes / (1024 * 1024));
    return {
      valid: false,
      error: `File size exceeds maximum limit of ${maxMb}MB.`,
    };
  }

  if (options.allowedExtensions && options.allowedExtensions.length > 0) {
    const ext = sanitizeFileExtension(file.name);
    const normalizedAllowed = options.allowedExtensions.map((e) =>
      e.replace(/^\./, "").toLowerCase()
    );
    if (!normalizedAllowed.includes(ext)) {
      return {
        valid: false,
        error: `File type .${ext} is not allowed. Allowed extensions: .${normalizedAllowed.join(", .")}`,
      };
    }
  }

  if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
    const mime = file.type?.toLowerCase().trim();
    if (!mime || !options.allowedMimeTypes.some((m) => mime.includes(m.toLowerCase()))) {
      return {
        valid: false,
        error: `Invalid file format (${mime || "unknown"}).`,
      };
    }
  }

  return { valid: true };
}

export async function uploadFileToBucket(
  bucket: string,
  path: string,
  file: File | Buffer,
  contentType: string
): Promise<string> {
  const admin = createAdminClient();
  const body = file instanceof File ? await file.arrayBuffer() : file;

  const { error } = await admin.storage.from(bucket).upload(path, body, {
    contentType: contentType || "application/octet-stream",
    cacheControl: "3600",
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  return path;
}

export async function createSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds: number,
  download?: string
): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds, download ? { download } : undefined);

  if (error) {
    throw new Error(error.message);
  }

  return data.signedUrl;
}

