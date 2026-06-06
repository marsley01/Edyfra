"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export type PermissionState = "unknown" | "granted" | "denied" | "warmed";

interface UseMediaPermissionsReturn {
  permDenied: boolean;
  permWarmed: boolean;
  requestMediaPermissions: () => Promise<boolean>;
}

/**
 * Manages camera + mic permission state.
 *
 * Why this is split out of StreamChatRoom:
 *   • StreamChatRoom is too large. The permission dance is its own concern
 *     (it can also be reused by Ringing UI / global call components).
 *   • It also does TWO different things:
 *       1. Quiet `navigator.permissions.query` on mount to detect previously
 *          blocked state (safe outside a user gesture).
 *       2. `getUserMedia` only inside a user gesture (otherwise Chrome auto-denies).
 *   Splitting makes those rules easier to enforce and unit test.
 */
export function useMediaPermissions(): UseMediaPermissionsReturn {
  const [permDenied, setPermDenied] = useState(false);
  const [permWarmed, setPermWarmed] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    let cancelled = false;

    (async () => {
      try {
        const checks = await Promise.allSettled([
          navigator.permissions.query({ name: "camera" as PermissionName }),
          navigator.permissions.query({ name: "microphone" as PermissionName }),
        ]);
        if (cancelled) return;
        const blocked = checks.some(
          (c) => c.status === "fulfilled" && c.value.state === "denied",
        );
        if (blocked) setPermDenied(true);
      } catch {
        // Permissions API not fully supported — silent fallback
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const requestMediaPermissions = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Camera/mic not supported", {
        description: "Your browser or device doesn't support video calls. Try Chrome or Edge.",
      });
      setPermDenied(true);
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setPermDenied(false);
      setPermWarmed(true);
      return true;
    } catch (err: any) {
      console.warn("[useMediaPermissions] getUserMedia failed:", err);
      setPermDenied(true);
      const isDenied = err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError";
      const isNoDevice = err?.name === "NotFoundError";
      if (isDenied) {
        toast.error("Camera or microphone access blocked", {
          description: "Click the lock icon in your address bar, allow camera + mic, then try again.",
        });
      } else if (isNoDevice) {
        toast.error("No camera or microphone found", {
          description: "Connect a device, then click Start Call again.",
        });
      } else {
        toast.error("Couldn't access your camera/mic", {
          description: err?.message || "Check your device settings.",
        });
      }
      return false;
    }
  }, []);

  return { permDenied, permWarmed, requestMediaPermissions };
}
