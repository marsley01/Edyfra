'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { CallingState, type Call } from '@stream-io/video-react-sdk';
import { Video, PhoneOff, Loader2, AlertTriangle } from 'lucide-react';
import { useVideoContext } from './VideoProvider';
import { DeviceCheck } from './DeviceCheck';
import { playOutgoingTone } from '@/lib/sounds';
import { probeMedia, queryMediaPermission } from '@/lib/video/media';
import {
  RING_TIMEOUT_MS,
  callErrorMessage,
  outgoingEndMessage,
} from '@/lib/video/call-utils';
import { prepareRoomCall } from '@/app/actions/video-call';

interface StartCallButtonProps {
  /** Study room id (Session id or booking id). Members are resolved server-side. */
  roomId: string;
  otherUserName: string;
  /** Kept for backwards compatibility; the server decides who is rung. */
  otherUserId?: string;
  /** Kept for backwards compatibility; the server sets the call's subject. */
  subject?: string;
}

type Step = 'idle' | 'device-check' | 'preparing' | 'calling' | 'joining' | 'error';
type Action = 'ring' | 'join';

const ONGOING_POLL_MS = 15_000;

/**
 * Starts a ringing call for a study room, or joins the room's call if one is
 * already in progress (e.g. after a refresh or a missed ring).
 *
 * The call itself is created server-side by prepareRoomCall (members from
 * the database); the browser only rings it. The Stream SDK drives the
 * ringing flow: once a callee accepts it joins the caller automatically, and
 * VideoProvider switches to the call UI as soon as the call reaches JOINED.
 * We only watch the calling state for the outcome.
 */
export function StartCallButton({ roomId, otherUserName }: StartCallButtonProps) {
  const { client, activeCall, isLoading } = useVideoContext();
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  // Only the id of an ongoing call: the Call object that gets joined is
  // always the SDK-registered instance (see joinOngoing)
  const [ongoingCall, setOngoingCall] = useState<{ type: string; id: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<Action>('ring');

  const outgoingRef = useRef<Call | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);
  // A start (media probe, ring or join) is in flight: blocks double clicks
  const busyRef = useRef(false);

  const stopRinging = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopRinging();
      // Navigating away mid-ring cancels the ring for the callee
      const call = outgoingRef.current;
      outgoingRef.current = null;
      if (call && call.state.callingState === CallingState.RINGING) {
        void call.leave({ reject: true, reason: 'cancel' }).catch(() => {});
      }
    };
  }, [stopRinging]);

  const fail = useCallback((msg: string) => {
    if (!mountedRef.current) return;
    setErrorMsg(msg);
    setStep('error');
  }, []);

  // Is there already a call going on in this room? (callee missed the ring,
  // someone refreshed, or the call dropped) — offer to join it.
  useEffect(() => {
    if (!client || activeCall || step !== 'idle') return;
    let cancelled = false;

    const check = async () => {
      try {
        // No `watch`: a watched query builds and registers a new Call (with
        // its own listeners) on every poll, and joining such a duplicate
        // left VideoProvider subscribed to a different object.
        const { calls } = await client.queryCalls({
          filter_conditions: { 'custom.roomId': roomId, ongoing: true },
          sort: [{ field: 'created_at', direction: -1 }],
          limit: 1,
        });
        if (cancelled) return;
        const call = calls[0];
        const live = !!call && call.state.participantCount > 0 && !call.state.endedAt;
        setOngoingCall((prev) => {
          if (!live) return null;
          return prev && prev.type === call.type && prev.id === call.id ? prev : { type: call.type, id: call.id };
        });
      } catch {
        if (!cancelled) setOngoingCall(null);
      }
    };

    void check();
    const t = setInterval(check, ONGOING_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [client, activeCall, roomId, step]);

  const ring = async ({ video }: { video: boolean }) => {
    if (!client) {
      fail('Video is still connecting. Give it a second and try again.');
      return;
    }
    setStep('preparing');

    const prep = await prepareRoomCall(roomId).catch(() => null);
    if (!prep || !prep.ok) {
      fail(prep && !prep.ok ? prep.error : "Couldn't start the call. Please try again.");
      return;
    }

    const call = client.call(prep.callType, prep.callId);
    outgoingRef.current = call;
    let rejectReason: string | undefined;
    let timedOut = false;
    let joined = false;
    let rang = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stateSub: { unsubscribe: () => void } | undefined;
    let cleanedUp = false;

    const stopTone = playOutgoingTone();
    const unsubRejected = call.on('call.rejected', (e) => {
      if (e.user?.id !== client.state.connectedUser?.id) rejectReason = e.reason || 'decline';
    });
    // Cleanup belongs to THIS call only, so it can never stop another
    // call's tone or leave this one's looping
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      clearTimeout(timer);
      stopTone();
      unsubRejected();
      stateSub?.unsubscribe();
      if (cleanupRef.current === cleanup) cleanupRef.current = null;
    };
    cleanupRef.current = cleanup;

    stateSub = call.state.callingState$.subscribe((state) => {
      if (state === CallingState.RINGING) rang = true;
      if (state === CallingState.JOINING || state === CallingState.JOINED) {
        if (!joined) {
          joined = true;
          cleanup();
          if (outgoingRef.current === call) outgoingRef.current = null;
          if (mountedRef.current) setStep('idle');
        }
      } else if ((state === CallingState.LEFT || state === CallingState.IDLE) && rang && !joined) {
        // Ring ended without a join: declined, busy, cancelled or timed out
        cleanup();
        if (outgoingRef.current !== call) return;
        outgoingRef.current = null;
        if (rejectReason === 'cancel') {
          if (mountedRef.current) setStep('idle');
          return;
        }
        fail(outgoingEndMessage(timedOut ? 'timeout' : rejectReason ?? 'timeout', otherUserName));
      }
    });
    // Backstop in case the call type's ring timeout is longer than ours
    timer = setTimeout(() => {
      if (call.state.callingState !== CallingState.RINGING) return;
      timedOut = true;
      void call.leave({ reject: true, reason: 'timeout' }).catch(() => {});
    }, RING_TIMEOUT_MS);

    try {
      if (!video) await call.camera.disable().catch(() => {});
      setStep('calling');
      // Members and custom data were set server-side by prepareRoomCall
      await call.get({ ring: true, video });
    } catch (err) {
      console.error('[StartCallButton] ring failed:', err);
      cleanup();
      if (outgoingRef.current === call) outgoingRef.current = null;
      fail(callErrorMessage(err));
    }
  };

  const joinOngoing = async ({ video }: { video: boolean }) => {
    if (!client || !ongoingCall) {
      if (mountedRef.current) setStep('idle');
      return;
    }
    // Reuse the instance the SDK already tracks for this cid (if any), so
    // VideoProvider sees the call reach JOINED; never join a second object.
    const call = client.call(ongoingCall.type, ongoingCall.id, { reuseInstance: true });
    const state = call.state.callingState;
    if (state === CallingState.JOINED || state === CallingState.JOINING) {
      if (mountedRef.current) setStep('idle');
      return;
    }
    setStep('joining');
    try {
      if (!video) await call.camera.disable().catch(() => {});
      await call.join();
      if (mountedRef.current) setStep('idle');
    } catch (err) {
      console.error('[StartCallButton] join ongoing failed:', err);
      setOngoingCall(null);
      fail(callErrorMessage(err));
    }
  };

  const start = async (action: Action, opts: { video: boolean }) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await (action === 'ring' ? ring : joinOngoing)(opts);
    } finally {
      busyRef.current = false;
    }
  };

  const begin = async (action: Action) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setPendingAction(action);
    // Leave idle right away: the media probe can take a while and the button
    // must not take a second click meanwhile
    setStep('preparing');
    let opts: { video: boolean } | null = null;
    try {
      // Skip the explainer when the browser already granted both devices
      if ((await queryMediaPermission()) === 'granted') {
        const media = await probeMedia();
        if (media.audio) opts = { video: media.video };
      }
    } catch {
      opts = null;
    } finally {
      busyRef.current = false;
    }
    if (!mountedRef.current) return;
    if (opts) await start(action, opts);
    else setStep('device-check');
  };

  const cancel = async () => {
    const call = outgoingRef.current;
    stopRinging();
    outgoingRef.current = null;
    setStep('idle');
    if (call) await call.leave({ reject: true, reason: 'cancel' }).catch(() => {});
  };

  if (step === 'device-check') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-md rounded-3xl bg-card border border-border/50 shadow-2xl p-6">
          <DeviceCheck
            onReady={(opts) => void start(pendingAction, opts)}
            onDenied={() => setStep('idle')}
          />
        </div>
      </div>
    );
  }

  if (step === 'preparing' || step === 'calling' || step === 'joining') {
    const joining = step === 'joining' || (step === 'preparing' && pendingAction === 'join');
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card px-4 py-2.5">
        <div className="flex h-9 w-9 animate-pulse items-center justify-center rounded-full bg-primary/15 text-primary">
          <Video className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {joining ? 'Joining call…' : `Calling ${otherUserName}…`}
          </p>
          <p className="text-xs text-muted-foreground">
            {step === 'preparing' ? 'Setting up' : step === 'joining' ? 'Connecting' : 'Waiting for them to answer'}
          </p>
        </div>
        {step === 'calling' && (
          <button
            onClick={cancel}
            className="ml-2 flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-medium transition-colors rounded-xl"
          >
            <PhoneOff className="h-3.5 w-3.5" /> Cancel
          </button>
        )}
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div role="alert" className="flex items-center gap-3 p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
        <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
        <p className="text-xs font-medium text-red-500">{errorMsg}</p>
        <button
          onClick={() => setStep('idle')}
          className="shrink-0 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"
        >
          OK
        </button>
      </div>
    );
  }

  if (activeCall) return null;

  if (ongoingCall) {
    return (
      <button
        onClick={() => void begin('join')}
        className="flex items-center gap-2 h-10 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-xs font-medium"
        title="A call is in progress in this room"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
        Join call
      </button>
    );
  }

  return (
    <button
      onClick={() => void begin('ring')}
      disabled={!client}
      className="flex items-center gap-2 h-10 px-4 bg-brand-orange-dark hover:bg-orange-700 text-white rounded-xl shadow-lg shadow-primary/20 transition-all text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      title={!client ? (isLoading ? 'Video is connecting…' : 'Video calling is unavailable') : `Start a video call with ${otherUserName}`}
    >
      {!client && isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
      <span className="hidden sm:inline">Video call</span>
    </button>
  );
}
