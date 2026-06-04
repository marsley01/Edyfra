"use client";

import dynamic from "next/dynamic";

const EddyChat = dynamic(() => import("@/components/chat/EddyChat"), {
  ssr: false,
});

export default function EddyChatWrapper() {
  return <EddyChat />;
}
