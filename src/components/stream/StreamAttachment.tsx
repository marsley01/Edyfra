"use client";

import { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Download,
  FileText,
  Music,
  Film,
  AlertCircle,
  Loader2,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types matching Stream Chat's attachment shape ──────────────────────────
type StreamAttachmentLike = {
  type?: string;
  mime_type?: string;
  title?: string;
  file_size?: number;
  asset_url?: string;
  image_url?: string;
  thumb_url?: string;
  url?: string;
  name?: string;
  fallback?: string;
  // For link previews
  og_scrape_url?: string;
  title_link?: string;
  // For giphy
  giphy?: any;
  // For location
  latitude?: number;
  longitude?: number;
};

type Props = {
  attachments: StreamAttachmentLike[];
  actionHandler?: any;
  // ... other props passed by stream-chat-react; we forward unknowns through
  [key: string]: any;
};

// ─── File-size + type helpers ───────────────────────────────────────────────
function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function pickUrl(a: StreamAttachmentLike): string {
  return a.asset_url || a.image_url || a.url || a.fallback || "";
}

function isAudio(att: StreamAttachmentLike): boolean {
  if (att.type === "audio") return true;
  const m = att.mime_type?.toLowerCase() || "";
  return m.startsWith("audio/") || /\.(mp3|m4a|wav|ogg|aac|flac|opus|webm)$/i.test(att.title || att.name || "");
}

function isVideo(att: StreamAttachmentLike): boolean {
  if (att.type === "video") return true;
  const m = att.mime_type?.toLowerCase() || "";
  return m.startsWith("video/") || /\.(mp4|mov|webm|mkv|avi|m4v|3gp)$/i.test(att.title || att.name || "");
}

function isImage(att: StreamAttachmentLike): boolean {
  if (att.type === "image") return true;
  const m = att.mime_type?.toLowerCase() || "";
  return m.startsWith("image/");
}

// ─── Robust audio player with error fallback + download ────────────────────
function AudioAttachment({ att }: { att: StreamAttachmentLike }) {
  const src = pickUrl(att);
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [errored, setErrored] = useState(false);
  const [errorName, setErrorName] = useState<string>("");

  // Reset state if the attachment URL changes
  useEffect(() => {
    setErrored(false);
    setErrorName("");
    setProgress(0);
    setDuration(0);
    setPlaying(false);
  }, [src]);

  const togglePlay = () => {
    const el = ref.current;
    if (!el || errored) return;
    if (el.paused) {
      el.play().catch((e) => {
        setErrored(true);
        setErrorName(e?.name || "PlayError");
      });
    } else {
      el.pause();
    }
  };

  const onTimeUpdate = () => {
    const el = ref.current;
    if (!el || !el.duration || isNaN(el.duration)) return;
    setProgress((el.currentTime / el.duration) * 100);
  };

  const onLoaded = () => {
    const el = ref.current;
    if (el && !isNaN(el.duration)) setDuration(el.duration);
    setLoading(false);
  };

  const onError = (e: any) => {
    setErrored(true);
    setErrorName(e?.target?.error?.message || "Media error");
    setLoading(false);
  };

  const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !el.duration || isNaN(el.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    el.currentTime = Math.max(0, Math.min(1, ratio)) * el.duration;
  };

  const baseName = (att.title || att.name || "audio").replace(/\.[^.]+$/, "");

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden max-w-md shadow-sm">
      <div className="flex items-center gap-3 p-3">
        <button
          onClick={togglePlay}
          disabled={errored}
          aria-label={playing ? "Pause" : "Play"}
          className={cn(
            "h-11 w-11 rounded-lg flex items-center justify-center shrink-0 transition-all",
            errored
              ? "bg-red-500/15 text-red-500 cursor-not-allowed"
              : "bg-gradient-to-br from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95"
          )}
        >
          {errored ? <AlertCircle className="h-5 w-5" /> :
            loading ? <Loader2 className="h-5 w-5 animate-spin" /> :
            playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Music className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
            <p className="text-sm font-bold truncate">{att.title || att.name || "Audio"}</p>
          </div>
          <div
            onClick={onSeek}
            className="mt-1.5 h-1.5 rounded-lg bg-secondary cursor-pointer overflow-hidden"
          >
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-[width] duration-100"
              style={{ width: `${errored ? 0 : progress}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-muted-foreground tabular-nums">
            <span>{errored ? "Cannot play" : formatTime((progress / 100) * duration)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {src && !errored && (
          <a
            href={src}
            download={att.title || att.name}
            target="_blank"
            rel="noreferrer"
            className="h-9 w-9 rounded-lg bg-secondary hover:bg-secondary/70 flex items-center justify-center shrink-0"
            aria-label="Download"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </a>
        )}
      </div>

      {errored && src && (
        <div className="px-3 pb-3 -mt-1">
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-2.5 flex items-center justify-between gap-2">
            <p className="text-[10px] text-red-600 dark:text-red-300 font-medium leading-relaxed">
              <strong>Can&apos;t play in browser.</strong> {errorName === "NotSupportedError" || /format/i.test(errorName)
                ? "Codec may be unsupported."
                : "Try downloading."}
            </p>
            <a
              href={src}
              download={att.title || `${baseName}.mp3`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500 text-white text-[10px] font-black uppercase tracking-widest shrink-0"
            >
              <Download className="h-3 w-3" /> Download
            </a>
          </div>
        </div>
      )}

      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onWaiting={() => setLoading(true)}
        onCanPlay={onLoaded}
        onLoadedMetadata={onLoaded}
        onTimeUpdate={onTimeUpdate}
        onError={onError}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        className="hidden"
      />
    </div>
  );
}

// ─── Robust video player with error fallback + download ─────────────────────
function VideoAttachment({ att }: { att: StreamAttachmentLike }) {
  const src = pickUrl(att);
  const ref = useRef<HTMLVideoElement>(null);
  const [errored, setErrored] = useState(false);
  const [errorName, setErrorName] = useState<string>("");

  useEffect(() => {
    setErrored(false);
    setErrorName("");
  }, [src]);

  const mime = att.mime_type || "video/mp4";

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden max-w-lg shadow-sm">
      <div className="relative bg-black">
        {errored ? (
          <div className="aspect-video flex flex-col items-center justify-center gap-2 p-6 text-center">
            <Film className="h-10 w-10 text-white/40" />
            <p className="text-white text-sm font-bold">Can&apos;t play this video</p>
            <p className="text-white/60 text-xs">
              {errorName === "NotSupportedError" || /format/i.test(errorName)
                ? "Your browser can't decode this codec."
                : "Try downloading to play it."}
            </p>
          </div>
        ) : (
          <video
            ref={ref}
            src={src}
            controls
            preload="metadata"
            playsInline
            // Critical: hint the codec so the browser picks the right decoder
            // without needing to download the whole file to sniff it
            // (multiple <source> not allowed inside <video> in HTML; the type on
            // the <video> isn't valid HTML but works in Chrome via mime_type
            // pass-through on Stream URLs)
            className="w-full max-h-[420px] object-contain bg-black"
            onError={(e: any) => {
              setErrored(true);
              setErrorName(e?.target?.error?.message || "Media error");
            }}
          />
        )}

        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-lg bg-background/80 backdrop-blur-md text-foreground text-[9px] font-black uppercase tracking-widest">
            {att.title?.split(".").pop() || mime.split("/")[1] || "video"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 p-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center shrink-0">
          <Film className="h-4 w-4 text-cyan-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">{att.title || att.name || "Video"}</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            {formatBytes(att.file_size)}{mime ? ` · ${mime}` : ""}
          </p>
        </div>
        {src && (
          <a
            href={src}
            download={att.title || att.name}
            target="_blank"
            rel="noreferrer"
            className="h-9 px-3 rounded-lg bg-secondary hover:bg-secondary/70 inline-flex items-center gap-1.5 text-xs font-bold shrink-0"
          >
            <Download className="h-3.5 w-3.5" /> Save
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Image attachment (uses native <img>) ───────────────────────────────────
function ImageAttachment({ att }: { att: StreamAttachmentLike }) {
  const src = pickUrl(att);
  return (
    <a href={src} target="_blank" rel="noreferrer" className="block max-w-md rounded-2xl overflow-hidden border border-border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={att.title || att.name || "Image"}
        className="w-full h-auto object-cover max-h-[420px]"
        loading="lazy"
      />
    </a>
  );
}

// ─── File attachment with download ──────────────────────────────────────────
function FileAttachment({ att }: { att: StreamAttachmentLike }) {
  const src = pickUrl(att);
  const isAudioFile = isAudio(att);
  const isVideoFile = isVideo(att);
  const Icon = isAudioFile ? Music : isVideoFile ? Film : FileText;

  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      download={att.title || att.name}
      className="flex items-center gap-3 max-w-md rounded-2xl border border-border bg-card p-3 hover:border-primary/50 transition-colors"
    >
      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-cyan-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">{att.title || att.name || "File"}</p>
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
          {formatBytes(att.file_size)}{att.mime_type ? ` · ${att.mime_type}` : ""}
        </p>
      </div>
      <div className="h-9 w-9 rounded-lg bg-secondary hover:bg-secondary/70 flex items-center justify-center shrink-0">
        <Download className="h-4 w-4" />
      </div>
    </a>
  );
}

// ─── Main exported Attachment component ─────────────────────────────────────
// Replaces stream-chat-react's default Attachment. Routes each attachment to
// the right player based on its mime_type, with graceful download fallback
// when the browser can't play the format.
export function StreamAttachment({ attachments, ...rest }: Props) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="space-y-2 [&_a]:no-underline">
      {attachments.map((att, i) => {
        if (isAudio(att)) return <AudioAttachment key={i} att={att} />;
        if (isVideo(att)) return <VideoAttachment key={i} att={att} />;
        if (isImage(att)) return <ImageAttachment key={i} att={att} />;
        return <FileAttachment key={i} att={att} />;
      })}
    </div>
  );
}

function formatTime(s: number): string {
  if (!s || isNaN(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
