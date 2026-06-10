"use client";

import dynamic from "next/dynamic";
import { MessageCircle } from "lucide-react";

const EddyChat = dynamic(() => import("@/components/chat/EddyChat"), {
  ssr: false,
  loading: () => (
    <button
      className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 cursor-wait z-40"
      aria-label="Loading chat..."
      disabled
    >
      <MessageCircle className="h-6 w-6 opacity-50" />
    </button>
  ),
});

export default function EddyChatWrapper() {
  return <EddyChat />;
}
