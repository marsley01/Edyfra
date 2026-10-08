'use client';

import { StreamVideo, StreamTheme, CallingState } from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import {
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
  useMemo,
  useRef,
} from 'react';
import {
  getCurrentVideoClient,
  getStreamVideoClient,
  resetVideoClient,
  subscribeVideoClient,
} from '@/lib/stream-video-client';
import { createClient as createSupabaseBrowserClient } from '@/utils/supabase/client';
import type { StreamVideoClient, Call } from '@stream-io/video-react-sdk';
import { IncomingCall } from './IncomingCall';
import { ActiveCall } from './ActiveCall';

interface VideoContextType {
  client: StreamVideoClient | null;
  activeCall: Call | null;
  setActiveCall: (call: Call | null) => void;
  isLoading: boolean;
  error: string | null;
  /** Stream / Prisma id of the connected user, once known. */
  currentUserId: string | null;
}

const DEFAULT_CONTEXT: VideoContextType = {
  client: null,
  activeCall: null,
  setActiveCall: () => {},
  isLoading: true,
  error: null,
  currentUserId: null,
};

const VideoContext = createContext<VideoContextType | null>(null);

export const useVideoContext = (): VideoContextType =>
  useContext(VideoContext) ?? DEFAULT_CONTEXT;

const LIVE_STATES = new Set<CallingState>([
  CallingState.JOINED,
  CallingState.RECONNECTING,
  CallingState.MIGRATING,
  CallingState.OFFLINE,
]);

/**
 * Provides the shared Stream Video client, and renders the incoming-call
 * sheet and the full-screen call UI for everything beneath it. Nested
 * providers (e.g. a page inside the dashboard) reuse the outer one so a ring
 * never shows twice.
 */
export function VideoProvider({ children }: { children: React.ReactNode }) {
  const parent = useContext(VideoContext);
  if (parent) return <>{children}</>;
  return <VideoProviderRoot>{children}</VideoProviderRoot>;
}

function VideoProviderRoot({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<StreamVideoClient | null>(() => getCurrentVideoClient());
  const [activeCall, setActiveCallState] = useState<Call | null>(null);
  const [isLoading, setIsLoading] = useState(!client);
  const [error, setError] = useState<string | null>(null);
  const activeCallRef = useRef<Call | null>(null);

  const setActiveCall = useCallback((call: Call | null) => {
    activeCallRef.current = call;
    setActiveCallState(call);
  }, []);

  // Track the shared client (created, replaced after re-login, cleared on logout)
  useEffect(() => subscribeVideoClient((c) => setClient(c)), []);

  const init = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const c = await getStreamVideoClient();
      setClient(c);
      if (!c) setError('Video calling is unavailable right now.');
    } catch (err) {
      console.error('[VideoProvider] init error:', err);
      setError('Could not connect to the video service.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void init();
  }, [init]);

  // Logout / account switch: drop the old user's socket and calls
  useEffect(() => {
    let lastAuthId: string | null | undefined;
    let supabase: ReturnType<typeof createSupabaseBrowserClient>;
    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      return;
    }
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const authId = session?.user?.id ?? null;
      if (event === 'INITIAL_SESSION') {
        lastAuthId = authId;
        return;
      }
      if (event === 'SIGNED_OUT' || !authId) {
        lastAuthId = null;
        setActiveCall(null);
        void resetVideoClient();
        return;
      }
      if (lastAuthId !== undefined && lastAuthId !== authId) {
        lastAuthId = authId;
        setActiveCall(null);
        void resetVideoClient().then(init);
        return;
      }
      lastAuthId = authId;
    });
    return () => data.subscription.unsubscribe();
  }, [init, setActiveCall]);

  // Whatever path joined a call (caller auto-join on accept, callee accept,
  // joining an ongoing call), show it; clear it once the call is left.
  useEffect(() => {
    if (!client) return;
    const perCall = new Map<string, { unsubscribe: () => void }>();

    const sub = client.state.calls$.subscribe((calls) => {
      const live = new Set(calls.map((c) => c.cid));
      for (const [cid, s] of perCall) {
        if (!live.has(cid)) {
          s.unsubscribe();
          perCall.delete(cid);
        }
      }
      for (const call of calls) {
        if (perCall.has(call.cid)) continue;
        perCall.set(
          call.cid,
          call.state.callingState$.subscribe((state) => {
            const current = activeCallRef.current;
            if (LIVE_STATES.has(state) && (!current || current.state.callingState === CallingState.LEFT)) {
              setActiveCall(call);
            } else if (
              (state === CallingState.LEFT || state === CallingState.RECONNECTING_FAILED) &&
              current?.cid === call.cid
            ) {
              setActiveCall(null);
            }
          }),
        );
      }
    });

    return () => {
      sub.unsubscribe();
      for (const s of perCall.values()) s.unsubscribe();
    };
  }, [client, setActiveCall]);

  // Signing out or switching accounts clears the client; drop any call UI
  useEffect(() => {
    if (!client && activeCallRef.current) setActiveCall(null);
  }, [client, setActiveCall]);

  const value = useMemo<VideoContextType>(
    () => ({
      client,
      activeCall,
      setActiveCall,
      isLoading,
      error,
      currentUserId: client?.state.connectedUser?.id ?? client?.streamClient.user?.id ?? null,
    }),
    [client, activeCall, setActiveCall, isLoading, error],
  );

  // The wrapper structure stays the same before and after the client loads,
  // so the page under it is never unmounted. StreamVideo is only a context
  // provider and tolerates a null client.
  return (
    <VideoContext.Provider value={value}>
      <StreamVideo client={client as StreamVideoClient}>
        <StreamTheme className="h-full w-full">
          {children}
          <IncomingCall />
          {activeCall && (
            <ActiveCall
              key={activeCall.cid}
              call={activeCall}
              onEnd={() => setActiveCall(null)}
            />
          )}
        </StreamTheme>
      </StreamVideo>
    </VideoContext.Provider>
  );
}
