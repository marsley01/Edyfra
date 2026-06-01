"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import "stream-chat-react/dist/css/index.css";

const StreamChatRoom = dynamic(
  () => import("@/components/stream/StreamChatRoom"),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> }
);

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<{ id: string; name?: string; avatar?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [dmPartners, setDmPartners] = useState<{ id: string; name: string; channelId: string }[]>([]);

  useEffect(() => {
    const channelParam = searchParams.get("channel");
    if (channelParam) {
      setActiveChannel(channelParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser({
        id: user.id,
        name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
        avatar: user.user_metadata?.avatar || undefined,
      });

      // Get recent conversations - users this person has messaged
      const { getRecentDMPartners } = await import("@/app/actions/stream");
      const partners = await getRecentDMPartners(user.id);
      setDmPartners(partners);
      setLoading(false);
    };
    init();
  }, [supabase]);

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 border-r border-border bg-secondary/30 flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-black tracking-tight">Messages</h1>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Direct conversations</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : dmPartners.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground font-medium">No conversations yet</p>
              <p className="text-[10px] text-muted-foreground">Message a tutor or peer to get started.</p>
            </div>
          ) : (
            dmPartners.map((partner) => (
              <button
                key={partner.channelId}
                onClick={() => setActiveChannel(partner.channelId)}
                className={`w-full text-left p-4 rounded-2xl transition-all ${
                  activeChannel === partner.channelId ? "bg-primary text-white" : "hover:bg-background"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={activeChannel === partner.channelId ? "bg-white/20" : ""}>
                      {partner.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-sm">{partner.name}</p>
                    <p className="text-[10px] opacity-60 uppercase tracking-widest font-medium">Conversation</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Chat Area */}
      <section className="flex-1 flex flex-col">
        {activeChannel && currentUser ? (
          <StreamChatRoom
            channelId={activeChannel}
            userId={currentUser.id}
            userName={currentUser.name || "User"}
            userImage={currentUser.avatar}
            hideHeader
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <MessageSquare className="h-16 w-16 text-muted-foreground/20 mx-auto" />
              <h2 className="text-2xl font-black tracking-tight">Your Messages</h2>
              <p className="text-muted-foreground font-medium">Select a conversation or message someone from their profile.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
