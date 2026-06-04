"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Mic,
  Camera,
  Video,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  Loader2,
  ShieldAlert,
  Smartphone,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DeviceInfo {
  kind: "videoinput" | "audioinput" | "audiooutput";
  label: string;
  deviceId: string;
}

interface DiagState {
  secureContext: boolean;
  isLocalhost: boolean;
  isFileProtocol: boolean;
  https: boolean;
  hasMediaDevices: boolean;
  cameras: DeviceInfo[];
  mics: DeviceInfo[];
  lastError: { name: string; message: string } | null;
  isRetesting: boolean;
  lastTestedAt: number | null;
}

const initialState: DiagState = {
  secureContext: false,
  isLocalhost: false,
  isFileProtocol: false,
  https: false,
  hasMediaDevices: false,
  cameras: [],
  mics: [],
  lastError: null,
  isRetesting: false,
  lastTestedAt: null,
};

export interface MediaDiagnosticProps {
  /** Re-run whenever this changes (e.g. when the user re-clicks Start Call) */
  trigger?: number;
  /** Called when the diagnostic detects permissions are actually OK */
  onResolved?: () => void;
}

export function MediaDiagnostic({ trigger = 0, onResolved }: MediaDiagnosticProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<DiagState>(initialState);

  const runDiagnostic = async () => {
    setState((s) => ({ ...s, isRetesting: true }));

    const isBrowser = typeof window !== "undefined" && typeof navigator !== "undefined";
    const isSecure = isBrowser ? window.isSecureContext : false;
    const isLocalhost = isBrowser
      ? /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(window.location.hostname)
      : false;
    const isFile = isBrowser ? window.location.protocol === "file:" : false;
    const https = isBrowser ? window.location.protocol === "https:" : false;
    const hasMD = isBrowser && !!navigator.mediaDevices?.getUserMedia;

    let cameras: DeviceInfo[] = [];
    let mics: DeviceInfo[] = [];
    if (hasMD && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        cameras = devices
          .filter((d) => d.kind === "videoinput")
          .map((d, i) => ({
            kind: "videoinput",
            label: d.label || `Camera ${i + 1}`,
            deviceId: d.deviceId,
          }));
        mics = devices
          .filter((d) => d.kind === "audioinput")
          .map((d, i) => ({
            kind: "audioinput",
            label: d.label || `Microphone ${i + 1}`,
            deviceId: d.deviceId,
          }));
      } catch {
        // silent
      }
    }

    setState((s) => ({
      ...s,
      secureContext: isSecure,
      isLocalhost,
      isFileProtocol: isFile,
      https,
      hasMediaDevices: hasMD,
      cameras,
      mics,
      lastTestedAt: Date.now(),
      isRetesting: false,
    }));
  };

  const runLiveTest = async () => {
    setState((s) => ({ ...s, isRetesting: true, lastError: null }));
    try {
      // First try a tiny audio-only test (lightest)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setState((s) => ({ ...s, lastError: null, isRetesting: false, lastTestedAt: Date.now() }));
      toast.success("Microphone access works!", {
        description: "You can now click Start Call. If the camera still fails, we'll fall back to audio-only.",
      });
      onResolved?.();
    } catch (err: any) {
      setState((s) => ({
        ...s,
        isRetesting: false,
        lastError: { name: err?.name || "Unknown", message: err?.message || "No message" },
        lastTestedAt: Date.now(),
      }));
    }
  };

  useEffect(() => {
    if (open) runDiagnostic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, trigger]);

  // ─── Verdict logic ─────────────────────────────────────────────────────────
  type Verdict = { ok: boolean; title: string; body: string; fix?: () => void };
  const verdicts: Verdict[] = [];

  if (!state.hasMediaDevices) {
    verdicts.push({
      ok: false,
      title: "Browser doesn't expose camera/mic",
      body: "navigator.mediaDevices is missing. Use Chrome 80+, Edge 80+, or Safari 14+.",
    });
  }

  if (!state.secureContext && !state.isLocalhost && !state.isFileProtocol) {
    verdicts.push({
      ok: false,
      title: "Insecure connection (HTTP)",
      body:
        "Browsers block camera/mic on plain HTTP unless the site is on localhost. " +
        "If you're accessing this over the network (e.g. http://192.168.1.x:3000), " +
        "either use https://, or set up Chrome to allow insecure origins for this device, " +
        "or tunnel via ngrok / cloudflared for an HTTPS URL.",
    });
  }

  if (state.hasMediaDevices && state.mics.length === 0) {
    verdicts.push({
      ok: false,
      title: "No microphone detected",
      body:
        "Chrome can't see a mic. Check that one is plugged in and not disabled in " +
        "Windows Settings → System → Sound → Input. On Linux, check `pavucontrol`.",
    });
  }

  if (state.hasMediaDevices && state.cameras.length === 0) {
    verdicts.push({
      ok: false,
      title: "No camera detected",
      body:
        "Chrome can't see a camera. Check it's plugged in, the lens cover is open, " +
        "and it's not disabled in Windows Device Manager.",
    });
  }

  if (state.lastError) {
    const e = state.lastError;
    if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
      verdicts.push({
        ok: false,
        title: "Browser-level block (NotAllowedError)",
        body:
          "You (or your OS) denied the camera/mic. Even after clicking the lock icon and " +
          "setting both to Allow, this can persist if Windows privacy settings, an " +
          "antivirus, or a corporate browser policy is also blocking.",
      });
    } else if (e.name === "NotFoundError" || e.name === "OverconstrainedError") {
      verdicts.push({
        ok: false,
        title: "No matching device (NotFoundError)",
        body:
          "No camera/mic matches the requested constraints. " +
          "Close other apps that might be using the device (Zoom, Meet, Teams, Discord, OBS, " +
          "Snap Camera, virtual cam software) and try again.",
      });
    } else if (e.name === "NotReadableError" || e.name === "TrackStartError") {
      verdicts.push({
        ok: false,
        title: "Device is busy (NotReadableError)",
        body:
          "Another app or browser tab is already using the camera or mic. Close " +
          "Zoom / Meet / Teams / Discord / OBS / browser tabs on other sites, then retry.",
      });
    } else if (e.name === "SecurityError") {
      verdicts.push({
        ok: false,
        title: "Security error",
        body:
          "The browser refused for security reasons. Make sure you're on HTTPS (or localhost), " +
          "and that no browser extension is interfering.",
      });
    } else {
      verdicts.push({
        ok: false,
        title: `Unexpected error (${e.name})`,
        body: e.message || "Try reloading the page and clicking the lock icon to reset permissions.",
      });
    }
  }

  const isWindows =
    typeof navigator !== "undefined" && /Windows/i.test(navigator.userAgent);

  if (isWindows && state.lastError) {
    verdicts.push({
      ok: false,
      title: "Windows privacy check (the #1 cause)",
      body:
        "Browser lock icon doesn't matter if Windows itself is blocking. " +
        "You need to flip TWO switches at the OS level.\n\n" +
        "1) Press Win + I to open Settings\n" +
        "2) Go to Privacy & security → Microphone:\n" +
        "   • 'Microphone access' = ON (master switch at the top)\n" +
        "   • 'Let apps access your microphone' = ON\n" +
        "   • 'Let desktop apps access your microphone' = ON (further down)\n" +
        "3) Then go to Privacy & security → Camera:\n" +
        "   • 'Camera access' = ON\n" +
        "   • 'Let apps access your camera' = ON\n" +
        "4) Restart Chrome completely (close ALL tabs, then reopen)\n\n" +
        "Click the 'Windows mic settings' / 'Windows cam settings' buttons below to jump straight there.",
    });
  }

  // If everything looks OK and we have a recent successful test, the verdict is green
  const isHealthy =
    state.hasMediaDevices &&
    state.mics.length > 0 &&
    state.cameras.length > 0 &&
    state.secureContext &&
    !state.lastError;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-300 hover:text-red-500 transition-colors"
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Run diagnostic
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-black uppercase tracking-widest text-[10px] text-red-600 dark:text-red-300 flex items-center gap-1.5">
                  <ShieldAlert className="h-3 w-3" />
                  Media diagnostic
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={runDiagnostic}
                  disabled={state.isRetesting}
                  className="h-7 rounded-full text-[10px] gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${state.isRetesting ? "animate-spin" : ""}`} />
                  Re-scan
                </Button>
              </div>

              {/* Verdict */}
              {isHealthy ? (
                <div className="flex items-start gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-emerald-600 dark:text-emerald-300">
                      Everything looks healthy
                    </p>
                    <p className="text-emerald-700 dark:text-emerald-200/80 mt-0.5">
                      Chrome can see your devices and the connection is secure. Click Start Call.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {verdicts.map((v, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-3"
                    >
                      <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-red-600 dark:text-red-300">{v.title}</p>
                        <p className="text-red-700/90 dark:text-red-200/80 mt-0.5 leading-relaxed">
                          {v.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Device list */}
              <div className="grid grid-cols-2 gap-2">
                <DeviceList
                  icon={<Camera className="h-3.5 w-3.5" />}
                  label="Cameras"
                  devices={state.cameras}
                />
                <DeviceList
                  icon={<Mic className="h-3.5 w-3.5" />}
                  label="Microphones"
                  devices={state.mics}
                />
              </div>

              {/* Secure context */}
              <Row
                ok={state.secureContext}
                label="Secure context"
                value={state.secureContext ? "Yes" : "No"}
                hint={
                  !state.secureContext
                    ? state.isLocalhost
                      ? "Localhost is treated as secure — should be fine."
                      : "HTTP is not secure. Use HTTPS or localhost."
                    : undefined
                }
              />
              <Row ok label="Protocol" value={state.isFileProtocol ? "file://" : state.https ? "https://" : "http://"} />
              <Row ok label="Hostname" value={typeof window !== "undefined" ? window.location.hostname : "?"} />

              {/* Last error */}
              {state.lastError && (
                <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-3 font-mono text-[10px] text-red-200">
                  <div className="font-black text-red-300 mb-1">Last error from browser</div>
                  <div>name: {state.lastError.name}</div>
                  <div className="break-all">message: {state.lastError.message}</div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-red-500/20">
                <Button
                  size="sm"
                  onClick={runLiveTest}
                  disabled={state.isRetesting}
                  className="h-8 rounded-full text-[10px] gap-1.5 bg-red-500 hover:bg-red-600 text-white"
                >
                  {state.isRetesting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Mic className="h-3 w-3" />
                  )}
                  Test microphone
                </Button>
                {isWindows && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        window.open("ms-settings:privacy-microphone", "_blank")
                      }
                      className="h-8 rounded-full text-[10px] gap-1.5"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Windows mic settings
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        window.open("ms-settings:privacy-webcam", "_blank")
                      }
                      className="h-8 rounded-full text-[10px] gap-1.5"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Windows cam settings
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Best-effort: open Chrome's site settings for the current origin
                    const origin = encodeURIComponent(window.location.origin);
                    window.open(`chrome://settings/content/siteData?searchSubpage=${origin}`, "_blank");
                  }}
                  className="h-8 rounded-full text-[10px] gap-1.5"
                >
                  <Lock className="h-3 w-3" />
                  Chrome site permissions
                </Button>
              </div>

              {state.lastTestedAt && (
                <p className="text-[9px] text-muted-foreground text-right font-bold uppercase tracking-widest">
                  Last scanned: {new Date(state.lastTestedAt).toLocaleTimeString()}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DeviceList({ icon, label, devices }: { icon: React.ReactNode; label: string; devices: DeviceInfo[] }) {
  return (
    <div className="rounded-xl bg-secondary/40 border border-border p-3">
      <div className="flex items-center gap-1.5 font-black text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
        <span className="ml-auto tabular-nums">{devices.length}</span>
      </div>
      {devices.length === 0 ? (
        <p className="mt-1.5 text-red-500 font-bold text-[10px]">None detected</p>
      ) : (
        <ul className="mt-1.5 space-y-0.5">
          {devices.map((d, i) => (
            <li key={i} className="text-[10px] font-mono truncate text-foreground/80">
              {d.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({
  ok,
  label,
  value,
  hint,
}: {
  ok: boolean;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-red-500" />
        )}
        <span className="font-mono text-[10px] text-foreground/80 truncate max-w-[200px]">
          {value}
        </span>
      </div>
      {hint && <p className="basis-full text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
