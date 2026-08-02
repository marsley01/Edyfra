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
