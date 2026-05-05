"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvatarPremium } from "@/components/ui/avatar-premium";
import { Badge } from "@/components/ui/badge";
import { Send, LogOut, MessageSquare, Cpu, Loader2, Sparkles, Zap, ShieldCheck, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { getSession as fetchSessionAction, sendMessage } from "@/app/actions/match";
import { GraduationCap } from "lucide-react";

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
  sessionId: string;
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

  const getCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUser(user);
  }, [supabase]);

  const fetchSession = useCallback(async () => {
    try {
      const data = await fetchSessionAction(sessionId);
      if (data) setSession(data as SessionData);
    } catch (e) {
      toast.error("Failed to load session");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from("Message")
      .select(`
        *,
        sender:User(name, avatar)
      `)
      .eq("sessionId", sessionId)
      .order("createdAt", { ascending: true });

    if (data) setMessages(data as MessageData[]);
  }, [sessionId, supabase]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    getCurrentUser();
    fetchSession();
  }, [getCurrentUser, fetchSession]);

  useEffect(() => {
    fetchMessages();
    const pollInterval = setInterval(fetchMessages, 3000);
    
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Message", filter: `sessionId=eq.${sessionId}` },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [sessionId, fetchMessages, supabase]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentUser) return;

    const currentInput = input;
    setInput("");

    // Optimistic update
    const tempId = Math.random().toString();
    const newMessage: MessageData = {
      id: tempId,
      sessionId,
      senderId: currentUser.id,
      content: currentInput,
      isMash: false,
      createdAt: new Date().toISOString(),
      sender: { name: "You", avatar: undefined }
    };
    setMessages(prev => [...prev, newMessage]);

    // Send via Server Action
    const { success, error } = await sendMessage({
      sessionId,
      senderId: currentUser.id,
      content: currentInput,
      isMash: false,
    });

    if (!success) {
      const errorMsg = error instanceof Error ? error.message : "Failed to send message";
      toast.error(errorMsg);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      return;
    }

    // Trigger Mash AI response when no human partner or MASH tier
    if (session?.tier === 'MASH' || !session?.partnerId) {
      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            message: currentInput,
            subject: session?.subject,
            topic: session?.topic
          }),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          console.error("AI API Error:", result);
          if (response.status === 500) {
            toast.error("AI is not set up yet. Add your Google AI key in Admin Settings.");
          } else {
            toast.error("Mash AI is temporarily unavailable. Your message was sent.");
          }
        }
      } catch (e) {
        console.error("Failed to call AI:", e);
        toast.error("Mash AI is temporarily unavailable. Your message was sent.");
      } finally {
        // Poll faster to get response
        let pollCount = 0;
        const fastPoll = setInterval(() => {
          fetchMessages();
          pollCount++;
          if (pollCount > 10) clearInterval(fastPoll);
        }, 1000);
      }
    }
  };

  const handleEndSession = async () => {
    if (!session) return;
    const { completeSession } = await import("@/app/actions/match");
    await completeSession(sessionId);
    toast.success("Session finished! Points awarded.");
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
          {/* Mobile back button */}
          <button
            onClick={() => router.back()}
            className="lg:hidden p-2 -ml-2 text-foreground hover:bg-primary/5 rounded-xl transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
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
               End Session
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
                       <Zap className="h-3 w-3" /> {session.partner ? "Studying Together" : "Waiting for a partner"}
                    </div>
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                      {session.partner 
                        ? `You're studying with ${session.partner.name}` 
                        : "Hang tight — we're finding someone to join you."}
                    </p>
                 </div>
                 <div className="p-4 rounded-2xl bg-background border border-border/50 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                       <ShieldCheck className="h-3 w-3" /> Private Session
                    </div>
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed">Your conversation stays between you and your study partner.</p>
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
                     <h3 className="text-xl font-black tracking-tight">You&apos;re all set.</h3>
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

