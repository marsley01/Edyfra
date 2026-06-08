"use client";

import { Lock, MessageSquare, X } from "lucide-react";
import { CallTimer } from "./CallTimer";

interface CallTopBarProps {
  sessionLabel: string;
  /** Hide the chat toggle button (e.g. desktop where chat is always visible). */
  hideChatToggle?: boolean;
  chatOpen?: boolean;
  onToggleChat?: () => void;
  onClose?: () => void;
}

/**
 * Top bar of the active call — Edyfra brand · secure-session chip · session
 * label · live timer · (optional) chat toggle · (optional) close.
 */
export function CallTopBar({
  sessionLabel,
  hideChatToggle = false,
  chatOpen = false,
  onToggleChat,
  onClose,
}: CallTopBarProps) {
  return (
    <div className="call-topbar">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300 shrink-0">
          Edyfra
        </span>
        <Lock className="h-3 w-3 text-emerald-400 shrink-0" aria-label="Encrypted" />
        <span className="h-3.5 w-px bg-white/15 shrink-0" />
        <span className="text-xs sm:text-sm font-bold text-white/90 truncate">
          {sessionLabel}
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <CallTimer />

        {!hideChatToggle && onToggleChat && (
          <button
            type="button"
            onClick={onToggleChat}
            className={`ctrl-btn !min-w-0 !flex-row !gap-1.5 !px-3 !py-1.5 ${
              chatOpen ? "ctrl-active" : ""
            }`}
            title={chatOpen ? "Hide chat" : "Show chat"}
            aria-label={chatOpen ? "Hide chat panel" : "Show chat panel"}
            aria-pressed={chatOpen}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="ctrl-label">Chat</span>
          </button>
        )}

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-background/80 hover:bg-background/90 text-foreground/70 hover:text-foreground flex items-center justify-center transition-colors"
            title="Minimise call"
            aria-label="Minimise call"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
