"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Chat, Channel, MessageList, MessageComposer, Window, Thread, WithComponents } from "stream-chat-react";
import "stream-chat-react/dist/css/index.css";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { polyfillClipboard } from "@/utils/clipboard-polyfill";
import { useStreamVideo } from "./StreamVideoProvider";
import { useStreamChatInit } from "./hooks/useStreamChatInit";
import { useCallSession } from "./hooks/useCallSession";
import { useMediaPermissions } from "./hooks/useMediaPermissions";
import { useStreamChatTheme } from "./hooks/useStreamChatTheme";
import { ChatHeader } from "./atomic/ChatHeader";
import { ChatErrorState } from "./atomic/ChatErrorState";
import { ChatLoadingState } from "./atomic/ChatLoadingState";
import { PermissionBanner } from "./atomic/PermissionBanner";
import { CallActiveOverlay } from "./atomic/CallActiveOverlay";
import { StreamAttachment } from "./StreamAttachment";
import { DynamicIsland } from "./DynamicIsland";
import { ActiveCall } from "./active-call/ActiveCall";
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
  const { client: videoClient, activeCall, setActiveCall } = useStreamVideo();
  const chatTheme = useStreamChatTheme();
  const { permDenied, permWarmed, requestMediaPermissions } = useMediaPermissions();

  const { chatClient, channel, error, isRetrying, retry } = useStreamChatInit({
    channelId,
    userId,
    userName,
    userImage,
    memberIds,
    channelName,
    mashAI,
  });

  const {
    callState,
    hasActiveCall,
    startOrJoinCall,
    leaveCall,
  } = useCallSession({
    channelId,
    userId,
    memberIds,
    videoClient,
    setActiveCall,
    onRequestPermissions: requestMediaPermissions,
  });

  const inCall = callState === "joined" || callState === "joining";
  const starting = callState === "starting";

  const memberCount = useMemo(() => memberIds?.length ?? 0, [memberIds]);

  const [minimised, setMinimised] = useState(false);

  // Auto-maximise whenever a new call starts so the user lands in the
  // full Zoom-style UI by default. They can minimise again with the X.
  useEffect(() => {
    if (inCall) setMinimised(false);
  }, [inCall, activeCall?.id]);

  const onMaximise = useCallback(() => setMinimised(false), []);
  const onMinimise = useCallback(() => setMinimised(true), []);

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
              <ChatHeader
                channelName={channelName || "Study Room"}
                memberCount={memberCount}
                inCall={inCall}
                starting={starting}
                hasActiveCall={hasActiveCall}
                permDenied={permDenied}
                permWarmed={permWarmed}
                onStartCall={startOrJoinCall}
              />
            )}

            {permDenied && !inCall && (
              <PermissionBanner onAllow={requestMediaPermissions} />
            )}

            <div className="flex-1 relative overflow-hidden">
              {inCall && activeCall && !minimised && (
                <ActiveCall
                  call={activeCall}
                  sessionLabel={channelName || "Study Room"}
                  onLeave={leaveCall}
                  onMinimize={onMinimise}
                />
              )}

              {inCall && activeCall && minimised && (
                <CallActiveOverlay call={activeCall}>
                  <DynamicIsland onLeave={leaveCall} onPillClick={onMaximise} />
                </CallActiveOverlay>
              )}

              {(!inCall || !activeCall || minimised) && (
                <Channel channel={channel}>
                  <Window>
                    <MessageList />
                    <MessageComposer />
                  </Window>
                  <Thread />
                </Channel>
              )}
            </div>
          </div>
        </Chat>
      </WithComponents>
    </div>
  );
}
