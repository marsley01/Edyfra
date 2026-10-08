'use client';

import { classifyMediaError, mediaErrorMessage, type MediaErrorKind } from './call-utils';

export interface MediaProbe {
  audio: boolean;
  video: boolean;
  /** Set when neither device could be opened. */
  error?: { kind: MediaErrorKind; message: string };
  /** Set when audio works but the camera didn't. */
  videoError?: { kind: MediaErrorKind; message: string };
}

/**
 * Asks for camera + mic (which triggers the browser permission prompt), then
 * releases the test tracks. Falls back to audio-only so a missing or blocked
 * camera doesn't stop someone from joining by voice.
 */
export async function probeMedia(): Promise<MediaProbe> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { audio: false, video: false, error: { kind: 'insecure', message: mediaErrorMessage('insecure') } };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return { audio: true, video: true };
  } catch (err) {
    const videoKind = classifyMediaError(err);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return {
        audio: true,
        video: false,
        videoError: { kind: videoKind, message: mediaErrorMessage(videoKind) },
      };
    } catch (audioErr) {
      const kind = classifyMediaError(audioErr);
      return { audio: false, video: false, error: { kind, message: mediaErrorMessage(kind) } };
    }
  }
}

/** Current permission state without prompting, when the browser supports it. */
export async function queryMediaPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  try {
    if (!navigator.permissions?.query) return 'unknown';
    const [cam, mic] = await Promise.all([
      navigator.permissions.query({ name: 'camera' as PermissionName }),
      navigator.permissions.query({ name: 'microphone' as PermissionName }),
    ]);
    if (cam.state === 'granted' && mic.state === 'granted') return 'granted';
    if (mic.state === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'unknown';
  }
}
