import { NextRequest, NextResponse } from "next/server";
import { getFirebaseStorage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";

/**
 * POST /api/firebase/storage/upload
 * Body: FormData with "file" and "path" fields
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const storagePath = formData.get("path") as string;

    if (!file || !storagePath) {
      return NextResponse.json({ error: "file and path required" }, { status: 400 });
    }

    const storage = getFirebaseStorage();
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytesResumable(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);

    return NextResponse.json({ url, path: storagePath });
  } catch (error: any) {
    console.error("[Firebase Storage] Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/firebase/storage
 * Body: { path: "..." }
 */
export async function DELETE(req: NextRequest) {
  try {
    const { path } = await req.json();
    if (!path) {
      return NextResponse.json({ error: "path required" }, { status: 400 });
    }

    const storage = getFirebaseStorage();
    await deleteObject(ref(storage, path));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Firebase Storage] Delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
