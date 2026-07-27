import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { getFirebaseFirestore } from "./firebase";

const COLLECTIONS = {
  resources: "resources",
  resourceFiles: "resourceFiles",
  resourceCategories: "resourceCategories",
  resourceReviews: "resourceReviews",
} as const;

function col(name: string) {
  return collection(getFirebaseFirestore(), name);
}

// ─── Resources ──────────────────────────────────────────────────────────────

export async function createResource(data: DocumentData) {
  return addDoc(col(COLLECTIONS.resources), {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function getResource(id: string) {
  const snap = await getDoc(doc(getFirebaseFirestore(), COLLECTIONS.resources, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listResources(opts?: {
  category?: string;
  status?: string;
  sellerId?: string;
  max?: number;
  sortField?: string;
  sortDir?: "asc" | "desc";
}) {
  const constraints: QueryConstraint[] = [];
  if (opts?.category) constraints.push(where("category", "==", opts.category));
  if (opts?.status) constraints.push(where("status", "==", opts.status));
  if (opts?.sellerId) constraints.push(where("sellerId", "==", opts.sellerId));
  if (opts?.sortField) {
    constraints.push(orderBy(opts.sortField, opts.sortDir || "desc"));
  } else {
    constraints.push(orderBy("createdAt", "desc"));
  }
  if (opts?.max) constraints.push(limit(opts.max));

  const snap = await getDocs(query(col(COLLECTIONS.resources), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateResource(id: string, data: Partial<DocumentData>) {
  await updateDoc(doc(getFirebaseFirestore(), COLLECTIONS.resources, id), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteResource(id: string) {
  await deleteDoc(doc(getFirebaseFirestore(), COLLECTIONS.resources, id));
}

// ─── Resource Files ─────────────────────────────────────────────────────────

export async function createResourceFile(resourceId: string, data: DocumentData) {
  return addDoc(col(COLLECTIONS.resourceFiles), {
    resourceId,
    ...data,
    uploadedAt: new Date().toISOString(),
  });
}

export async function listResourceFiles(resourceId: string) {
  const q = query(
    col(COLLECTIONS.resourceFiles),
    where("resourceId", "==", resourceId),
    orderBy("uploadedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Categories ─────────────────────────────────────────────────────────────

export async function createResourceCategory(data: DocumentData) {
  return addDoc(col(COLLECTIONS.resourceCategories), {
    ...data,
    createdAt: new Date().toISOString(),
  });
}

export async function listResourceCategories() {
  const snap = await getDocs(
    query(col(COLLECTIONS.resourceCategories), orderBy("name", "asc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Reviews ────────────────────────────────────────────────────────────────

export async function createResourceReview(resourceId: string, data: DocumentData) {
  return addDoc(col(COLLECTIONS.resourceReviews), {
    resourceId,
    ...data,
    createdAt: new Date().toISOString(),
  });
}

export async function listResourceReviews(resourceId: string) {
  const q = query(
    col(COLLECTIONS.resourceReviews),
    where("resourceId", "==", resourceId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
