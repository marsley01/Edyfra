"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvatarPremium } from "@/components/ui/avatar-premium";
import { Badge } from "@/components/ui/badge";
import { Send, LogOut, MessageSquare, Cpu, Loader2, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface SessionData {
  id: string;
  tier: string;
  subject: string;
  topic?: string;
  status: string;
  studentId: string;
  partnerId?: string;
  student: { name: string; avatar?: string };
  partner?: { name: string; avatar?: string };
}

interface MessageData {
  id: string;
  content: string;
  senderId?: string;
  isMash: boolean;
  createdAt: string;
  sender?: { name: string; avatar?: string };
}

export default function StudyRoomPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const router = useRouter();
  const supabase = createClient();
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    getCurrentUser();
    fetchSession();
  }, [sessionId]);

  useEffect(() => {
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Message",
          filter: `sessionId=eq.${sessionId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from("Message")
            .select(`*, sender:senderId(name, avatar)`)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, data];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUser({ id: user.id });
  };

  const fetchSession = async () => {
    const { data, error } = await supabase
      .from("Session")
      .select(`*, student:studentId(name, avatar), partner:partnerId(name, avatar)`)
      .eq("id", sessionId)
      .single();

    if (error || !data) {
      toast.error("Session not found");
      router.push("/dashboard");
      return;
    }
    setSession(data);
    fetchMessages();
    setLoading(false);
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("Message")
      .select(`*, sender:senderId(name, avatar)`)
      .eq("sessionId", sessionId)
      .order("createdAt", { ascending: true });
    if (data) setMessages(data);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentUser) return;

    const { error } = await supabase.from("Message").insert({
      sessionId,
      senderId: currentUser.id,
      content: input,
      isMash: false,
    });

    if (error) {
      toast.error("Failed to send message");
    } else {
      const currentInput = input;
      setInput("");
      
      // If it's an AI session (no partner), trigger AI response
      if (!session?.partnerId) {
        try {
          await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              message: currentInput,
              subject: session?.subject,
              topic: session?.topic
            }),
          });
        } catch (e) {
          console.error("Failed to trigger AI:", e);
        }
      }
    }
  };

  const handleEndSession = async () => {
    if (!session) return;
    await supabase
      .from("Session")
      .update({ status: "COMPLETED", endedAt: new Date().toISOString() })
      .eq("id", sessionId);
    toast.success("Session finished!");
    router.push("/dashboard");
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center space-y-4 bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Opening your study room...</p>
    </div>
  );

  if (!session) return null;

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <header className="h-20 border-b border-border/50 px-8 flex items-center justify-between bg-background/80 backdrop-blur-2xl z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <Sparkles className="h-5 w-5" />
             </div>
             <div>
                <h1 className="text-sm font-black uppercase tracking-widest">{session.subject}</h1>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{session.topic || "Study Session"}</p>
             </div>
          </div>
          <div className="h-8 w-[1px] bg-border" />
          <div className="flex items-center gap-2">
             <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-black tracking-widest uppercase">
               {session.status === "ACTIVE" ? "Live" : session.status}
             </Badge>
             <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">ID: {sessionId.slice(0,8)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="hidden md:flex -space-x-3">
              <AvatarPremium seed={session.student?.name} size="sm" className="border-2 border-background" />
              {session.partner && (
                <AvatarPremium seed={session.partner.name} size="sm" className="border-2 border-background" />
              )}
           </div>
           <Button onClick={handleEndSession} variant="ghost" className="h-10 px-6 rounded-xl border border-border/50 font-black text-[10px] tracking-widest uppercase hover:bg-red-500/10 hover:text-red-500 transition-all">
              Leave Session
           </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-border/50 bg-secondary/30 hidden xl:flex flex-col p-8 space-y-8">
           <div className="space-y-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Session Info</p>
              <div className="space-y-3">
                 <div className="p-4 rounded-2xl bg-background border border-border/50 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                       <Zap className="h-3 w-3" /> Connection
                    </div>
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                      {session.partner 
                        ? `Studying with ${session.partner.name}` 
                        : "Waiting for a partner to join..."}
                    </p>
                 </div>
                 <div className="p-4 rounded-2xl bg-background border border-border/50 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                       <ShieldCheck className="h-3 w-3" /> Secure
                    </div>
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed">Your session is private and encrypted.</p>
                 </div>
              </div>
           </div>

           <div className="flex-1" />

           <div className="p-6 rounded-[2rem] bg-primary/10 border border-primary/20 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Member Tier</p>
              <h4 className="text-xl font-black tracking-tightest">{session.tier}</h4>
           </div>
        </aside>

        {/* Chat */}
        <section className="flex-1 flex flex-col bg-background relative">
           <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 md:p-12 space-y-12 scroll-smooth">
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                 <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-muted-foreground/30">
                    <GraduationCap className="h-8 w-8" />
                 </div>
                 <div className="space-y-1">
                    <h3 className="text-xl font-black tracking-tight">Session Started.</h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      {session.subject} • {session.topic || "General"} • {new Date().toLocaleDateString()}
                    </p>
                 </div>
              </div>

              <div className="max-w-4xl mx-auto space-y-8">
                 {messages.length === 0 && (
                   <div className="text-center py-12">
                     <p className="text-muted-foreground font-medium">Say hello to get started!</p>
                   </div>
                 )}
                 {messages.map((msg) => {
                    const isMe = currentUser && msg.senderId === currentUser.id;
                    return (
                       <motion.div
                         key={msg.id}
                         initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                         animate={{ opacity: 1, x: 0 }}
                         className={`flex items-start gap-4 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                       >
                          <AvatarPremium seed={msg.sender?.name || "User"} size="md" />
                          <div className={`space-y-2 max-w-[80%] ${isMe ? "items-end" : "items-start"}`}>
                             <div className={`px-6 py-4 rounded-[2rem] text-sm md:text-base font-medium leading-relaxed shadow-sm border ${
                               isMe ? "bg-primary text-white border-primary/20 rounded-tr-none" : "bg-secondary text-foreground border-border/50 rounded-tl-none"
                             }`}>
                                {msg.content}
                             </div>
                             <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-2">
                               {msg.sender?.name || "User"} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </p>
                          </div>
                       </motion.div>
                    );
                 })}
              </div>
           </div>

           {/* Input */}
           <div className="p-8 bg-background/50 backdrop-blur-xl border-t border-border/50">
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-4">
                 <div className="relative flex-1 group">
                    <Input 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type a message..." 
                      className="h-16 pl-8 pr-16 rounded-[2rem] border-border bg-secondary shadow-inner focus-visible:ring-primary text-lg font-medium"
                    />
                 </div>
                 <Button type="submit" size="icon" className="h-16 w-16 rounded-[2rem] bg-foreground text-background hover:bg-foreground/90 transition-all active:scale-90 shadow-xl">
                    <Send className="h-6 w-6" />
                 </Button>
              </form>
           </div>
        </section>
      </main>
    </div>
  );
}

const GraduationCap = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
);
