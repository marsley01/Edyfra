"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  PhoneOff,
  Minimize2,
  Signal,
  WifiLow,
  Wifi,
  Circle,
  Loader2,
  Volume2,
  VolumeX,
  Sparkles,
  Bot,
  X as XIcon,
  Hand,
  ScreenShare,
} from "lucide-react";
import {
  useCallStateHooks,
  CallingState,
  ParticipantView,
  SpeakerLayout,
  StreamTheme,
} from "@stream-io/video-react-sdk";
import { cn } from "@/lib/utils";

/**
 * The Dynamic Island — modeled after the iPhone's Dynamic Island.
 *
 * States (modeled after iOS Live Activities):
 *   1. HIDDEN        — no call, no activity. Not rendered.
 *   2. MINIMAL       — small pill, just the live dot. Used while joining.
 *   3. COMPACT       — default during a call: live dot + "Live" + timer +
 *                      participant count + quick mic/cam/leave controls.
 *                      This is the iOS "compact" Dynamic Island.
 *   4. EXPANDED      — tap or long-press the pill to expand. Shows the
 *                      full video grid, contact info, and all controls.
 *                      This is the iOS "expanded" Dynamic Island.
 *
 * Interactions (matching iOS):
 *   • TAP the pill          → toggle between COMPACT and EXPANDED.
 *   • LONG-PRESS the pill   → quick-action overlay (mute / camera / leave).
 *   • TAP outside the panel → collapse back to COMPACT.
 *   • Tap again on COMPACT  → re-expand.
 *
 * Smooth morphing between states is achieved with framer-motion's shared
 * `layoutId` so the pill and the panel feel like a single fluid surface.
 */
export function DynamicIsland({
  onLeave,
  remoteName,
  remoteImage,
  className,
  thinkingMessage,
  onDismissThinking,
}: {
  onLeave: () => void;
  remoteName?: string;
  remoteImage?: string;
  className?: string;
  thinkingMessage?: string | null;
  onDismissThinking?: () => void;
}) {
  const [mode, setMode] = useState<"compact" | "expanded">("compact");
  const [longPressOpen, setLongPressOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef<number>(Date.now());
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const {
    useCallCallingState,
    useLocalParticipant,
    useRemoteParticipants,
    useMicrophoneState,
    useCameraState,
    useSpeakerState,
    useIsCallRecordingInProgress,
    useCallStatsReport,
  } = useCallStateHooks();
  const callingState = useCallCallingState();
  const local = useLocalParticipant();
  const remotes = useRemoteParticipants();
  const mic = useMicrophoneState();
  const cam = useCameraState();
  const speaker = useSpeakerState();
  const isRecording = useIsCallRecordingInProgress();
  const stats = useCallStatsReport();

  // Elapsed-time ticker — only run when joined.
  useEffect(() => {
    if (callingState !== CallingState.JOINED) return;
    startedAtRef.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [callingState]);

  const isJoined = callingState === CallingState.JOINED;
  const isJoining =
    callingState === CallingState.JOINING || callingState === CallingState.RINGING;
  const participants = remotes.length + 1;
  const isMuted = mic.isMute;
  const isCamOff = cam.isMute;

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  // Quality tier
  const [quality, setQuality] = useState<"good" | "ok" | "bad">("good");
  useEffect(() => {
    const raw = (stats as any)?.qualityScore ?? (stats as any)?.score;
    if (typeof raw === "number") {
      if (raw >= 80) setQuality("good");
      else if (raw >= 50) setQuality("ok");
      else setQuality("bad");
    } else {
      setQuality("good");
    }
  }, [stats]);

  const toggleMic = useCallback(() => {
    try {
      mic.microphone.toggle();
    } catch (e) {
      /* noop */
    }
  }, [mic.microphone]);
  const toggleCam = useCallback(() => {
    try {
      cam.camera.toggle();
    } catch (e) {
      /* noop */
    }
  }, [cam.camera]);

  // Long-press detection (iOS-style)
  const handlePressStart = useCallback(() => {
    didLongPress.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setLongPressOpen(true);
    }, 500);
  }, []);
  const handlePressEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const handlePillClick = useCallback(() => {
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    if (isJoined) setMode((m) => (m === "compact" ? "expanded" : "compact"));
  }, [isJoined]);

  // Click-outside-to-dismiss for the expanded panel
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mode !== "expanded") return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as HTMLElement;
      if (!panelRef.current) return;
      if (panelRef.current.contains(t)) return;
      // Don't dismiss if clicking the pill (it'll toggle via its own handler)
      if (t.closest("[data-edyfra-island-pill]")) return;
      setMode("compact");
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [mode]);

  // Escape to collapse (iOS-ish)
  useEffect(() => {
    if (mode !== "expanded") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMode("compact");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mode]);

  // ── Sub-renderers ──────────────────────────────────────────────────────────

  // Default: a thinking Mash AI bubble (iOS would show a Live Activity).
  if (thinkingMessage && !isJoined && !isJoining) {
    return (
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
        <motion.div
          layoutId="edyfra-island"
          initial={{ y: -40, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -40, opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="flex items-center gap-2.5 h-11 pl-3 pr-4 rounded-full bg-zinc-950/95 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] text-white"
        >
          <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 border border-primary/30">
            <Bot className="h-3.5 w-3.5 text-cyan-300" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
              Mash AI
            </span>
            <span className="text-[10px] text-white/70 font-medium max-w-[200px] truncate">
              {thinkingMessage}
            </span>
          </div>
          <span className="flex gap-0.5 ml-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce" />
          </span>
          {onDismissThinking && (
            <button
              type="button"
              onClick={onDismissThinking}
              className="ml-1 h-6 w-6 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80"
              aria-label="Dismiss"
            >
              <XIcon className="h-3 w-3" />
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  // ── COMPACT pill (iOS compact Dynamic Island) ──────────────────────────────
  const CompactPill = (
    <motion.button
      key="compact"
      data-edyfra-island-pill
      layoutId="edyfra-island"
      onPointerDown={handlePressStart}
      onPointerUp={handlePressEnd}
      onPointerLeave={handlePressEnd}
      onPointerCancel={handlePressEnd}
      onClick={handlePillClick}
      initial={{ y: -40, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -40, opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      whileHover={isJoined ? { scale: 1.02 } : undefined}
      whileTap={isJoined ? { scale: 0.97 } : undefined}
      className={cn(
        "group relative flex items-center gap-2 sm:gap-3 h-11 px-3 sm:px-4",
        // iOS Dynamic Island proportions
        "rounded-[22px] bg-black/95 backdrop-blur-2xl",
        "border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]",
        "text-white select-none touch-none",
        isJoined ? "cursor-pointer" : "cursor-default opacity-95",
        className,
      )}
      aria-label={isJoined ? "Call controls" : "Call status"}
    >
      {/* Status indicator (camera/screen region of iOS island) */}
      <span className="relative flex h-6 w-6 items-center justify-center">
        {isJoining ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" />
        ) : isJoined ? (
          <>
            <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]" />
          </>
        ) : (
          <Circle className="h-2 w-2 text-zinc-500" />
        )}
      </span>

      {/* Status label */}
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white">
        {isJoined ? "Live" : isJoining ? "Connecting" : "Idle"}
      </span>

      {/* Divider */}
      <span className="h-3.5 w-px bg-white/15" />

      {/* Timer */}
      <span className="text-[11px] font-bold tabular-nums text-white/90 tracking-tight">
        {isJoined ? `${mm}:${ss}` : "00:00"}
      </span>

      {/* Divider */}
      <span className="h-3.5 w-px bg-white/15" />

      {/* Participants */}
      <div className="flex items-center gap-1 text-[10px] font-bold text-white/70">
        <span className="tabular-nums">{participants}</span>
        <span className="hidden sm:inline">in call</span>
      </div>

      {/* Quality chip — hidden on small screens to keep pill compact */}
      {isJoined && (
        <span
          className={cn(
            "hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
            quality === "good" && "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
            quality === "ok" && "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30",
            quality === "bad" && "bg-red-500/15 text-red-300 border border-red-500/30",
          )}
        >
          {quality === "good" ? (
            <Signal className="h-2.5 w-2.5" />
          ) : quality === "ok" ? (
            <WifiLow className="h-2.5 w-2.5" />
          ) : (
            <Wifi className="h-2.5 w-2.5" />
          )}
          {quality === "good" ? "HD" : quality === "ok" ? "SD" : "Low"}
        </span>
      )}

      {/* Recording chip */}
      {isRecording && (
        <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-[8px] font-black uppercase tracking-widest text-red-300">
          REC
        </span>
      )}

      {/* Divider */}
      <span className="h-3.5 w-px bg-white/15" />

      {/* Quick controls — tap area is split so clicking them doesn't toggle expand */}
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <IslandIconButton
          onClick={toggleMic}
          active={!isMuted}
          label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        </IslandIconButton>
        <IslandIconButton
          onClick={toggleCam}
          active={!isCamOff}
          label={isCamOff ? "Camera on" : "Camera off"}
        >
          {isCamOff ? <CameraOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
        </IslandIconButton>
        <button
          type="button"
          onClick={onLeave}
          className="ml-0.5 inline-flex items-center justify-center h-7 w-7 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors shadow-[0_0_10px_rgba(239,68,68,0.5)]"
          aria-label="End call"
        >
          <PhoneOff className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Subtle sheen overlay (iOS gloss) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[22px] opacity-50"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 45%)",
        }}
      />
    </motion.button>
  );

  // ── EXPANDED panel (iOS expanded Dynamic Island) ───────────────────────────
  const ExpandedPanel = (
    <motion.div
      key="expanded"
      ref={panelRef}
      layoutId="edyfra-island"
      initial={{ opacity: 0.9, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className={cn(
        "relative w-[min(96vw,1080px)] h-[min(86vh,700px)] rounded-[28px] overflow-hidden",
        "bg-black border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.65)]",
        "flex flex-col",
        className,
      )}
    >
      {/* Top status bar — iOS expanded style */}
      <div className="flex justify-between items-center p-3 sm:p-4 bg-gradient-to-b from-black/85 via-black/50 to-transparent z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Remote avatar */}
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-white text-xs font-black ring-1 ring-white/20 shrink-0">
            {remoteImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={remoteImage} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              (remoteName?.[0] || "·").toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white">
                Live
              </span>
              <span className="text-[10px] text-white/60 font-bold tabular-nums">
                {mm}:{ss}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs font-bold text-white truncate max-w-[200px] sm:max-w-[300px]">
              {remoteName || "Study Room"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRecording && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-[9px] font-black uppercase tracking-widest text-red-300">
              REC
            </span>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
              quality === "good" && "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
              quality === "ok" && "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30",
              quality === "bad" && "bg-red-500/15 text-red-300 border border-red-500/30",
            )}
          >
            {quality === "good" ? "HD" : quality === "ok" ? "SD" : "Low"}
          </span>
          <button
            type="button"
            onClick={() => setMode("compact")}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            <Minimize2 className="h-3 w-3" /> Minimize
          </button>
        </div>
      </div>

      {/* Video grid */}
      <div className="flex-1 flex items-center justify-center px-3 pb-24 pt-1">
        {remotes.length === 0 ? (
          <WaitingForOthers local={local} />
        ) : (
          <SpeakerLayout participantsBarPosition="bottom" />
        )}
      </div>

      {/* Bottom controls — iOS-style glass dock */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
        <StreamTheme>
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-full bg-zinc-950/95 backdrop-blur-xl border border-white/10 shadow-2xl">
            <IslandIconButton
              onClick={toggleMic}
              active={!isMuted}
              label={isMuted ? "Unmute" : "Mute"}
              size="md"
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </IslandIconButton>
            <IslandIconButton
              onClick={toggleCam}
              active={!isCamOff}
              label={isCamOff ? "Camera on" : "Camera off"}
              size="md"
            >
              {isCamOff ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            </IslandIconButton>
            <button
              type="button"
              onClick={onLeave}
              className="ml-1 inline-flex items-center gap-2 h-9 px-4 rounded-full bg-red-500 hover:bg-red-600 text-white text-[11px] font-black uppercase tracking-widest transition-colors shadow-[0_0_16px_rgba(239,68,68,0.5)]"
            >
              <PhoneOff className="h-4 w-4" /> End
            </button>
          </div>
        </StreamTheme>
      </div>
    </motion.div>
  );

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="pointer-events-auto">
        <AnimatePresence mode="wait" initial={false}>
          {mode === "expanded" ? ExpandedPanel : CompactPill}
        </AnimatePresence>
      </div>

      {/* Long-press quick actions (iOS Live Activity style) */}
      <AnimatePresence>
        {longPressOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="pointer-events-auto absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 flex items-center gap-1.5 px-2 py-2 rounded-2xl bg-zinc-950/95 backdrop-blur-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
            onPointerLeave={() => setLongPressOpen(false)}
          >
            <LongPressAction
              onClick={() => {
                toggleMic();
                setLongPressOpen(false);
              }}
              active={!isMuted}
              label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </LongPressAction>
            <LongPressAction
              onClick={() => {
                toggleCam();
                setLongPressOpen(false);
              }}
              active={!isCamOff}
              label={isCamOff ? "Camera on" : "Camera off"}
            >
              {isCamOff ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            </LongPressAction>
            <LongPressAction label="Raise hand" onClick={() => setLongPressOpen(false)}>
              <Hand className="h-4 w-4" />
            </LongPressAction>
            <LongPressAction
              label={speaker.selectedDevice ? "Speaker" : "Audio"}
              onClick={() => {
                try {
                  speaker.speaker.select(speaker.selectedDevice || "default");
                } catch (e) {
                  /* noop */
                }
                setLongPressOpen(false);
              }}
            >
              {speaker.selectedDevice ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </LongPressAction>
            <LongPressAction label="Share" onClick={() => setLongPressOpen(false)}>
              <ScreenShare className="h-4 w-4" />
            </LongPressAction>
            <button
              type="button"
              onClick={() => {
                onLeave();
                setLongPressOpen(false);
              }}
              className="ml-1 inline-flex items-center gap-1.5 h-10 px-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest"
            >
              <PhoneOff className="h-4 w-4" /> End
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IslandIconButton({
  onClick,
  active,
  children,
  label,
  size = "sm",
}: {
  onClick: () => void;
  active: boolean;
  children: React.ReactNode;
  label: string;
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "h-9 w-9" : "h-7 w-7";
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        dim,
        "inline-flex items-center justify-center rounded-full transition-all",
        active
          ? "bg-white/10 hover:bg-white/20 text-white"
          : "bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30",
      )}
    >
      {children}
    </button>
  );
}

function LongPressAction({
  onClick,
  active,
  children,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "h-10 w-10 inline-flex items-center justify-center rounded-xl transition-all",
        active === false
          ? "bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30"
          : "bg-white/10 hover:bg-white/20 text-white",
      )}
    >
      {children}
    </button>
  );
}

function WaitingForOthers({ local }: { local: any }) {
  return (
    <div className="flex flex-col items-center justify-center text-center text-white/80 max-w-md mx-auto">
      <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-primary/50 shadow-[0_0_30px_rgba(6,182,212,0.4)] mb-4 bg-zinc-900">
        {local && <ParticipantView participant={local} />}
      </div>
      <p className="text-sm font-bold">You&apos;re live</p>
      <p className="text-[11px] text-white/50 mt-1 flex items-center justify-center gap-1">
        <Sparkles className="h-3 w-3" /> Connecting you now — hang tight.
      </p>
    </div>
  );
}
