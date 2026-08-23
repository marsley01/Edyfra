"use client";

import dynamic from "next/dynamic";
import { ChatLoadingState } from "@/components/stream/atomic/ChatLoadingState";

const EddyChat = dynamic(() => import("@/components/chat/EddyChat"), {
  ssr: false,
  loading: () => <ChatLoadingState />,
});

export default function EddyChatWrapper() {
  return <EddyChat />;
}
