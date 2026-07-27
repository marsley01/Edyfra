import { ref, uploadBytesResumable, getDownloadURL, deleteObject, type UploadTask } from "firebase/storage";
import { getFirebaseStorage } from "./firebase";

type UploadResult = { url: string; path: string };

const BUCKET_PATHS = {
  avatars: "avatars",
  kycDocs: "kyc-docs",
  resources: "resources",
  sessionFiles: "session-files",
  institutionLogos: "institution-logos",
} as const;

function storageRef(path: string) {
  return ref(getFirebaseStorage(), path);
}

export async function uploadAvatar(userId: string, file: File): Promise<UploadResult> {
  const path = `${BUCKET_PATHS.avatars}/${userId}/${Date.now()}_${file.name}`;
  const snapshot = await uploadBytesResumable(storageRef(path), file);
  const url = await getDownloadURL(snapshot.ref);
  return { url, path };
}

export async function uploadKycDocument(userId: string, file: File, docType: string): Promise<UploadResult> {
  const path = `${BUCKET_PATHS.kycDocs}/${userId}/${docType}_${Date.now()}_${file.name}`;
  const snapshot = await uploadBytesResumable(storageRef(path), file);
  const url = await getDownloadURL(snapshot.ref);
  return { url, path };
}

export async function uploadResource(sellerId: string, file: File): Promise<UploadResult> {
  const path = `${BUCKET_PATHS.resources}/${sellerId}/${Date.now()}_${file.name}`;
  const snapshot = await uploadBytesResumable(storageRef(path), file);
  const url = await getDownloadURL(snapshot.ref);
  return { url, path };
}

export async function uploadSessionFile(sessionId: string, file: File): Promise<UploadResult> {
  const path = `${BUCKET_PATHS.sessionFiles}/${sessionId}/${Date.now()}_${file.name}`;
  const snapshot = await uploadBytesResumable(storageRef(path), file);
  const url = await getDownloadURL(snapshot.ref);
  return { url, path };
}

export async function uploadInstitutionLogo(institutionId: string, file: File): Promise<UploadResult> {
  const path = `${BUCKET_PATHS.institutionLogos}/${institutionId}/logo_${Date.now()}_${file.name}`;
  const snapshot = await uploadBytesResumable(storageRef(path), file);
  const url = await getDownloadURL(snapshot.ref);
  return { url, path };
}

export function createUploadTask(path: string, file: File): UploadTask {
  return uploadBytesResumable(storageRef(path), file);
}

export async function deleteFile(path: string): Promise<void> {
  await deleteObject(storageRef(path));
}

export async function getFileUrl(path: string): Promise<string> {
  return getDownloadURL(storageRef(path));
}
