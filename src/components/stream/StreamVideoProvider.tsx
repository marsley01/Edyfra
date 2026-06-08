"use client";

import {
  StreamVideo,
  StreamVideoClient,
  User,
  Call,
} from "@stream-io/video-react-sdk";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { getStreamToken } from "@/app/actions/stream";
import { createClient } from "@/utils/supabase/client";
import { showError } from "@/lib/toast";
import { usePathname, useRouter } from "next/navigation";
import { Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { useRegisterOverlay } from "@/lib/overlay-manager";
import { Z } from "@/lib/layers";

const STREAM_KEY = process.env.NEXT_PUBLIC_STREAM_KEY!;

interface StreamVideoContextValue {
  client: StreamVideoClient | null;
  activeCall: Call | null;
  setActiveCall: (call: Call | null) => void;
}

const StreamVideoContext = createContext<StreamVideoContextValue>({
  client: null,
  activeCall: null,
  setActiveCall: () => {},
});

export const useStreamVideo = () => useContext(StreamVideoContext);

export function StreamVideoProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [ringingUser, setRingingUser] = useState<{ name: string; avatar?: string } | null>(null);
  const initRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    let dispose: (() => void) | undefined;

    const initClient = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
        const token = await getStreamToken(user.id);
        const streamUser: User = {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
          image: user.user_metadata?.avatar || undefined,
        };

        const vClient = new StreamVideoClient({
          apiKey: STREAM_KEY,
          user: streamUser,
          token,
          options: { logLevel: "warn" },
        });

        setClient(vClient);

        const unsubscribe = vClient.on("call.ring", (event) => {
          if (event.call) {
            const call = vClient.call(event.call.type, event.call.id);
            setIncomingCall(call);
            setRingingUser({
              name: event.user?.name || "Someone",
              avatar: event.user?.image,
            });
          }
        });

        dispose = () => {
          unsubscribe();
          vClient.disconnectUser();
        };
      } catch (err) {
        console.error("[StreamVideoProvider] Failed to init:", err);
      }
    };

    initClient();

    return () => {
      dispose?.();
      initRef.current = false;
    };
  }, []);

  const handleAccept = async () => {
    if (!incomingCall) return;
    try {
      await incomingCall.join();
      setActiveCall(incomingCall);
      setIncomingCall(null);
      setRingingUser(null);
      if (!pathname?.includes(incomingCall.id)) {
        router.push(`/study-room/${incomingCall.id}`);
      }
    } catch (err) {
      showError({
        title: "We couldn't put you in the call",
        cause: "The video service didn't connect.",
        fix: "Check your camera/mic permissions, then try joining again.",
        raw: err,
      });
      setIncomingCall(null);
    }
  };

  const handleReject = async () => {
    if (!incomingCall) return;
    try {
      await incomingCall.reject();
    } catch {
      /* noop */
    }
    setIncomingCall(null);
    setRingingUser(null);
  };

  return (
    <StreamVideoContext.Provider value={{ client, activeCall, setActiveCall }}>
      {client ? (
        <StreamVideo client={client}>
          {children}
          <RingingOverlay
            incomingCall={incomingCall}
            ringingUser={ringingUser}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        </StreamVideo>
      ) : (
        children
      )}
    </StreamVideoContext.Provider>
  );
}

interface RingingOverlayProps {
  incomingCall: Call | null;
  ringingUser: { name: string; avatar?: string } | null;
  onAccept: () => void;
  onReject: () => void;
}

function RingingOverlay({ incomingCall, ringingUser, onAccept, onReject }: RingingOverlayProps) {
  const visible = !!incomingCall;

  useRegisterOverlay(
    { id: "incoming-call", edge: "bottom", slot: "ringing", size: visible ? 200 : 0 },
    [visible],
  );

  return (
    <AnimatePresence>
      {visible && incomingCall && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md"
          style={{ zIndex: Z.RINGING }}
        >
          <div className="bg-background/80 backdrop-blur-lg border border-border rounded-xl p-6 shadow-2xl flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-xl animate-pulse" />
              <div className="w-20 h-20 rounded-full border-2 border-primary/50 overflow-hidden relative z-10 bg-card flex items-center justify-center">
                {ringingUser?.avatar ? (
                  <img src={ringingUser.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-white/20">{ringingUser?.name?.[0]}</span>
                )}
              </div>
            </div>

            <h3 className="text-lg font-black text-foreground uppercase tracking-tightest">
              Incoming Call
            </h3>
            <p className="text-sm text-foreground/60 font-medium mb-8">
              {ringingUser?.name} is ready to study
            </p>

            <div className="flex items-center gap-4 w-full">
              <Button
                onClick={onReject}
                variant="ghost"
                className="flex-1 h-14 rounded-2xl bg-background/80 hover:bg-red-500/10 hover:text-red-500 text-foreground/40 transition-all border border-border"
              >
                <PhoneOff className="h-5 w-5 mr-2" /> Decline
              </Button>
              <Button
                onClick={onAccept}
                className="flex-1 h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black shadow-lg shadow-primary/20 transition-all"
              >
                <Phone className="h-5 w-5 mr-2 animate-bounce" /> Accept
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
