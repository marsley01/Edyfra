"use client";

import { useCallback } from "react";
import { Chat, Channel, MessageList, MessageComposer, Window, Thread, WithComponents } from "stream-chat-react";
import "stream-chat-react/dist/css/index.css";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { polyfillClipboard } from "@/utils/clipboard-polyfill";
import { useStreamChatInit } from "./hooks/useStreamChatInit";
import { useStreamChatTheme } from "./hooks/useStreamChatTheme";
import { ChatErrorState } from "./atomic/ChatErrorState";
import { ChatLoadingState } from "./atomic/ChatLoadingState";
import { StreamAttachment } from "./StreamAttachment";
import { EDYFRA_CHAT_THEME_CSS } from "./styles/chatTheme";
import type { StreamChatRoomProps } from "./types";

polyfillClipboard();

export default function StreamChatRoom({
  channelId,
  userId,
  userName,
  userImage,
  memberIds,
  channelName,
  hideHeader,
  mashAI,
}: StreamChatRoomProps) {
  const chatTheme = useStreamChatTheme();

  const { chatClient, channel, error, isRetrying, retry } = useStreamChatInit({
    channelId,
    userId,
    userName,
    userImage,
    memberIds,
    channelName,
    mashAI,
  });

  // ─── Error state ─────────────────────────────────────────────────────────
  if (error) {
    return <ChatErrorState error={error} isRetrying={isRetrying} onRetry={retry} />;
  }

  // ─── Loading state ───────────────────────────────────────────────────────
  if (!chatClient || !channel) {
    return <ChatLoadingState />;
  }

  return (
    <div className="h-full w-full edyfra-chat-wrapper flex flex-col overflow-hidden">
      <style>{EDYFRA_CHAT_THEME_CSS}</style>
      <WithComponents overrides={{ Attachment: StreamAttachment as any }}>
        <Chat client={chatClient} theme={chatTheme}>
          <div className="flex flex-col h-full relative">
            {!hideHeader && (
              <div className="flex items-center px-6 py-4 bg-background/50 backdrop-blur-xl border-b border-white/5 z-20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <span className="text-primary text-lg">💬</span>
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
                      {channelName || "Study Room"}
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                      {(memberIds?.length ?? 0) === 0 ? "Just you" : `${(memberIds?.length ?? 0) + 2} Members`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 relative overflow-hidden">
              <Channel channel={channel}>
                <Window>
                  <MessageList />
                  <MessageComposer />
                </Window>
                <Thread />
              </Channel>
            </div>
          </div>
        </Chat>
      </WithComponents>
    </div>
  );
}
