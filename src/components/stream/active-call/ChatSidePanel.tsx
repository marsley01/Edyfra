"use client";

import { Send } from "lucide-react";
import {
  MessageList,
  MessageComposer,
  WithComponents,
  type SendButtonProps,
} from "stream-chat-react";

/**
 * Custom send button for the in-call side panel. Keeps the visual style
 * consistent with the rest of the call UI (cyan-on-dark) instead of the
 * stream-chat-react default.
 */
function CallSendButton({ sendMessage, disabled, ...rest }: SendButtonProps) {
  return (
    <button
      type="button"
      aria-label="Send message"
      onClick={sendMessage}
      disabled={disabled}
      className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-cyan-500/10 transition-colors disabled:opacity-40 text-cyan-300"
      {...rest}
    >
      <Send className="h-4 w-4" />
    </button>
  );
}

/**
 * Compact chat side panel rendered inside the active call. Uses the
 * existing stream-chat-react Channel context (provided by the parent
 * <StreamChatRoom>) so messages and the composer stay in sync with the
 * main channel.
 *
 * Threaded replies are intentionally not rendered here — a side panel is
 * too narrow for the full thread UX. Replies collapse to the main list.
 */
export function ChatSidePanel() {
  return (
    <aside className="chat-side-panel" aria-label="Call chat">
      <WithComponents overrides={{ SendButton: CallSendButton }}>
        <MessageList />
        <MessageComposer />
      </WithComponents>
    </aside>
  );
}
