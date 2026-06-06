/**
 * Quality + capability settings applied to every call we create.
 * Tuned for high quality: 1080p target, adaptive bitrate, noise suppression,
 * dynacast simulcast so remote viewers get a quality layer matched to their
 * viewport + bandwidth.
 */
export const CALL_SETTINGS = {
  audio: {
    mic_default_on: true,
    default_device: "speaker",
    noise_cancellation: { mode: "auto" },
  },
  video: {
    camera_default_on: true,
    camera_facing: "user",
    target_resolution: { width: 1920, height: 1080 },
    enabled_for_caller: true,
  },
  broadcasting: { enabled: false },
  recording: { enabled: false },
} as const;

export const HIGH_QUALITY_OVERRIDE = {
  settings_override: {
    video: { target_resolution: { width: 1920, height: 1080 } },
  },
} as const;
