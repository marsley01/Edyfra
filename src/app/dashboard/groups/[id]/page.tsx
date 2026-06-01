"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2, ChevronLeft } from "lucide-react";
import { getGroupById } from "@/app/actions/groups";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const StreamChatRoom = dynamic(
  () => import("@/components/stream/StreamChatRoom"),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> }
);

interface GroupData {
  id: string;
  name: string;
  subject: string;
  topic: string;
  level: string;
  members: string[];
}

export default function GroupChatPage() {
  const params = useParams();
  const groupId = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; name?: string; avatar?: string } | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser({
          id: user.id,
          name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
          avatar: user.user_metadata?.avatar || undefined,
        });
      }
    };
    init();
  }, [supabase]);

  useEffect(() => {
    const loadGroup = async () => {
      try {
        const data = await getGroupById(groupId);
        setGroup(data as any);
      } catch {
        toast.error("Failed to load group");
      } finally {
        setLoading(false);
      }
    };
    loadGroup();
  }, [groupId]);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mt-4">
        Loading group...
      </p>
    </div>
  );

  if (!group) return null;

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <header className="h-20 border-b border-border/50 px-8 flex items-center justify-between bg-background/80 backdrop-blur-2xl z-50">
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-foreground hover:bg-primary/5 rounded-xl transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-widest">{group.name}</h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {group.subject} • {group.topic}
              </p>
            </div>
          </div>
          <div className="h-8 w-[1px] bg-border" />
          <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black tracking-widest uppercase">
            {group.members.length} members
          </Badge>
        </div>
      </header>

      {/* Stream Chat */}
      <section className="flex-1 flex flex-col bg-background relative">
        {currentUser && (
          <StreamChatRoom
            channelId={`group_${groupId}`}
            userId={currentUser.id}
            userName={currentUser.name || "User"}
            userImage={currentUser.avatar}
            memberIds={group.members}
            channelName={group.name}
          />
        )}
      </section>
    </div>
  );
}
