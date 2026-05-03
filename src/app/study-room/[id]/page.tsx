"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, LogOut, MessageSquare, Cpu, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  senderId: string | null;
  isMash: boolean;
  createdAt: string;
  sender: {
    name: string;
    avatar: string | null;
  } | null;
}

interface SessionData {
  id: string;
  tier: string;
  subject: string;
  topic: string | null;
  student: {
    name: string;
    avatar: string | null;
  };
  partner: {
    name: string;
    avatar: string | null;
  } | null;
}

interface UserData {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
}

export default function StudyRoomPage() {
  const { id: sessionId } = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [session, setSession] = useState<SessionData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser({
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
      });
    }
  }, [supabase]);

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from("Message")
      .select(`
        *,
        sender:senderId(name, avatar)
      `)
      .eq("sessionId", sessionId)
      .order("createdAt", { ascending: true });

    if (error) console.error(error);
    if (data) setMessages(data);
  }, [sessionId, supabase]);

  const subscribeToMessages = useCallback(() => {
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
          
          if (data) setMessages((prev) => [...prev, data]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  const fetchSession = useCallback(async () => {
    const { data, error } = await supabase
      .from("Session")
      .select(`
        *,
        student:studentId(name, avatar),
        partner:partnerId(name, avatar)
      `)
      .eq("id", sessionId)
      .single();

    if (error) {
      console.error(error);
      toast.error("Session not found");
      router.push("/dashboard");
      return;
    }

    setSession(data);
    fetchMessages();
    subscribeToMessages();
    setLoading(false);
  }, [sessionId, supabase, router, fetchMessages, subscribeToMessages]);

  useEffect(() => {
    fetchSession();
    getCurrentUser();
  }, [sessionId, fetchSession, getCurrentUser]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentUser) return;

    const messageContent = input.trim();
    setInput("");

    const { error } = await supabase.from("Message").insert({
      sessionId,
      senderId: currentUser.id,
      content: messageContent,
      isMash: false,
    });

    if (error) {
      toast.error("Failed to send message");
    } else {
      // If AI session, trigger AI response
      if (session?.tier === "MASH") {
        handleAIResponse(messageContent);
      }
    }
  };

  const handleAIResponse = useCallback(async (userMessage: string) => {
    if (!session) return;
    try {
        await fetch("/api/ai/chat", {
            method: "POST",
            body: JSON.stringify({
                sessionId,
                message: userMessage,
                subject: session.subject,
                topic: session.topic
            })
        });
    } catch (err) {
        console.error("AI response error", err);
    }
  }, [sessionId, session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-8 gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="px-3 py-1">
            {session?.tier} SESSION
          </Badge>
          <h1 className="text-xl font-bold">{session?.subject}</h1>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">{session?.topic || "General Study"}</span>
        </div>
        <Button variant="ghost" onClick={() => router.push("/dashboard")} className="gap-2">
          <LogOut className="h-4 w-4" />
          Leave Room
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 overflow-hidden">
        {/* Left Side: Session Info */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Participants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{session?.student?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{session?.student?.name}</p>
                  <p className="text-xs text-muted-foreground">Student (You)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session?.tier === "MASH" ? "/mash-avatar.png" : ""} />
                  <AvatarFallback>
                    {session?.tier === "MASH" ? <Cpu className="h-4 w-4" /> : session?.partner?.name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {session?.tier === "MASH" ? "Mash AI" : session?.partner?.name || "Waiting..."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session?.tier === "TUTOR" ? "Verified Tutor" : session?.tier === "PEER" ? "Study Peer" : "Instant AI Assistant"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Study Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Working on {session?.subject} {session?.topic ? `topic: ${session.topic}` : ""}.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Chat Room */}
        <Card className="lg:col-span-3 flex flex-col overflow-hidden">
          <CardHeader className="border-b bg-muted/50 py-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">Live Discussion</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.senderId === currentUser?.id ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {msg.isMash ? "Mash AI" : msg.sender?.name}
                      </span>
                    </div>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        msg.senderId === currentUser?.id
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-muted text-foreground rounded-tl-none"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
              <Input
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

