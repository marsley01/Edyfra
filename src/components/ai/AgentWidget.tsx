"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Sparkles, User, Minimize2 } from "lucide-react";
import { usePathname } from "next/navigation";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function AgentWidget({ agentId }: { agentId: "eddy" | "mash" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnreadWelcome, setHasUnreadWelcome] = useState(true);
  const pathname = usePathname();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isEddy = agentId === "eddy";
  const agentName = isEddy ? "Eddy" : "Mash";
  // Theme-aware tokens so the widget follows the active accent color
  // (light/dark and admin-selected accent) instead of hardcoded hues.
  const agentTheme = "from-primary via-primary/90 to-primary/70 shadow-primary/40";
  const agentBg = "bg-primary";
  const agentText = "text-primary";
  const agentLightBg = "bg-primary/[0.07] border-primary/20";
  
  const welcomeTip = isEddy 
    ? "Hey! I'm Eddy, your learning assistant. What are we studying today?"
    : "Hey! I'm Mash, your tutor assistant. Need help managing your sessions?";

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      setHasUnreadWelcome(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch(`/api/ai/${agentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content, path: pathname }),
      });

      if (!response.ok) throw new Error("Network response was not ok");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error("No reader available");

      const assistantMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [...prev, { id: assistantMessageId, role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") break;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.t) {
                setMessages((prev) => 
                  prev.map(m => m.id === assistantMessageId ? { ...m, content: m.content + data.t } : m)
                );
              }
              if (data.error) {
                setMessages((prev) => 
                  prev.map(m => m.id === assistantMessageId ? { ...m, content: data.error } : m)
                );
              }
            } catch (e) {
              // Ignore malformed JSON in stream chunk
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [...prev, { 
        id: Date.now().toString(), 
        role: "assistant", 
        content: "Sorry, I'm having trouble connecting right now. Try again later!" 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-4 lg:bottom-6 lg:right-6 z-50 flex flex-col items-end pointer-events-none">
      
      {/* Expanded Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-[350px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)] bg-background border border-border shadow-2xl rounded-3xl mb-4 flex flex-col overflow-hidden pointer-events-auto"
          >
            {/* Header */}
            <div className={`p-4 bg-gradient-to-r ${agentTheme} flex items-center justify-between text-white shadow-md z-10`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-widest uppercase">{agentName}</h3>
                  <p className="text-[10px] text-white/80 font-bold tracking-widest uppercase">AI Assistant</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-secondary/10">
              {/* Welcome Message */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3"
              >
                <div className={`w-8 h-8 rounded-full ${agentBg} text-white flex items-center justify-center shrink-0 shadow-lg`}>
                  <Bot className="w-4 h-4" />
                </div>
                <div className={`bg-card border ${agentLightBg} p-3 rounded-2xl rounded-tl-sm text-sm shadow-sm`}>
                  {welcomeTip}
                </div>
              </motion.div>

              {/* Message History */}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : `${agentBg} text-white`
                  }`}>
                    {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`p-3 rounded-2xl text-sm shadow-sm max-w-[80%] whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : `bg-card border ${agentLightBg} rounded-tl-sm`
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full ${agentBg} text-white flex items-center justify-center shrink-0 shadow-lg`}>
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className={`bg-card border ${agentLightBg} p-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-background border-t border-border z-10 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
              <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Ask ${agentName} something...`}
                  className="flex-1 bg-secondary rounded-full h-11 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                  disabled={isTyping}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  aria-label="Send message"
                  className={`absolute right-1.5 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    input.trim() && !isTyping ? `${agentBg} text-white shadow-md` : "text-muted-foreground"
                  }`}
                >
                  <Send className="w-3.5 h-3.5 ml-0.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Orb */}
      <div className="relative pointer-events-auto">
        <AnimatePresence>
          {!isOpen && hasUnreadWelcome && !isHovered && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`absolute bottom-full mb-3 right-0 w-48 p-3 rounded-2xl rounded-br-sm text-xs font-medium shadow-xl border bg-background ${agentText}`}
            >
              {welcomeTip}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsOpen(!isOpen)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          aria-label={isOpen ? `Close ${agentName} chat` : `Open ${agentName} chat`}
          aria-expanded={isOpen}
          className={`relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-transform hover:scale-110 active:scale-95 z-50`}
        >
          {/* Breathing Background Glow */}
          {!isOpen && (
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute inset-0 rounded-full bg-gradient-to-r ${agentTheme} blur-lg -z-10`}
            />
          )}
          
          {/* Orb */}
          <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${agentTheme} flex items-center justify-center text-white overflow-hidden`}>
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="w-6 h-6" />
                </motion.div>
              ) : (
                <motion.div
                  key="bot"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center relative"
                >
                  <Bot className="w-6 h-6" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 -m-1 border border-white/30 rounded-full border-t-transparent"
                  />
                  <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-white animate-pulse" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Notification Dot */}
          {!isOpen && hasUnreadWelcome && (
            <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-background animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
}
