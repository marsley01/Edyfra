"use client";

import { useCallback, useEffect, useState } from "react";
import { showError } from "@/lib/toast";

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
      showError({
        title: "Camera/mic not supported",
        cause: "Your browser doesn't allow camera or mic access here.",
        fix: "Try a different browser (Chrome, Edge, Safari) and reload.",
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
        showError({
          title: "Camera/mic access blocked",
          cause: "Your browser is blocking camera/mic permissions.",
          fix: "Click the lock icon in the address bar and allow camera and mic.",
        });
      } else if (isNoDevice) {
        showError({
          title: "No camera or mic found",
          cause: "We can't see a camera or mic on this device.",
          fix: "Plug one in, or join from a device that has one.",
        });
      } else {
        showError({
          title: "Couldn't reach your camera/mic",
          cause: "Your browser refused to share them.",
          fix: "Check your privacy settings, then reload this page.",
          raw: err,
        });
      }
      return false;
    }
  }, []);

  return { permDenied, permWarmed, requestMediaPermissions };
}
