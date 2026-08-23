export const BLOCKED_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.php', '.py', '.rb', '.pl', '.sh', '.bash',
  '.exe', '.bat', '.cmd', '.com', '.msi',
  '.html', '.htm', '.svg', '.xml',
  '.env', '.pem', '.key', '.cert',
  '.sql', '.db', '.sqlite'
];

export const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export const MAX_FILE_SIZE_MB = 10;

export function validateUpload(file: { name: string; type: string; size: number }): { valid: boolean; reason?: string } {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return { valid: false, reason: `File type ${ext} is not allowed` };
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, reason: 'This file type is not supported' };
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return { valid: false, reason: `File must be under ${MAX_FILE_SIZE_MB}MB` };
  }
  return { valid: true };
}
