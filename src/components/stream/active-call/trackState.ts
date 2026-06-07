import { SfuModels } from "@stream-io/video-react-sdk";
import type { StreamVideoParticipant } from "@stream-io/video-react-sdk";

export type TrackKind = "audio" | "video" | "screen" | "screenAudio";

/**
 * Stream's `publishedTracks` is a numeric enum (`TrackType`) on the SFU
 * model. To keep the call sites readable we expose a string-keyed helper
 * that does the right enum comparison for us.
 */
export function hasTrack(
  participant: StreamVideoParticipant | null | undefined,
  kind: TrackKind,
): boolean {
  if (!participant) return false;
  const tracks = participant.publishedTracks ?? [];
  switch (kind) {
    case "audio":
      return tracks.includes(SfuModels.TrackType.AUDIO as never);
    case "video":
      return tracks.includes(SfuModels.TrackType.VIDEO as never);
    case "screen":
      return tracks.includes(SfuModels.TrackType.SCREEN_SHARE as never);
    case "screenAudio":
      return tracks.includes(SfuModels.TrackType.SCREEN_SHARE_AUDIO as never);
  }
}
