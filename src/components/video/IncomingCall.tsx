'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { CallingState, type Call } from '@stream-io/video-react-sdk';
import { Phone, PhoneOff, Loader2 } from 'lucide-react';
import { useVideoContext } from './VideoProvider';
import { playIncomingRingtone } from '@/lib/sounds';
import { probeMedia } from '@/lib/video/media';
import { callErrorMessage, INCOMING_TIMEOUT_S } from '@/lib/video/call-utils';
import { showInfo } from '@/lib/toast';

interface IncomingCallProps {
  /** Optional: VideoProvider already shows the call once it is joined. */
  onAccepted?: (call: Call) => void;
}

function isIncomingRing(call: Call): boolean {
  return call.ringing && !call.isCreatedByMe && call.state.callingState === CallingState.RINGING;
}

/**
 * Incoming ring sheet. Rendered once by VideoProvider.
 *
 * Instead of listening for raw `call.ring` events (which were missed when the
 * component mounted before the client existed), this watches the client's
 * call store: the SDK adds every ringing call to it and keeps its
 * callingState current (caller cancelled, answered on another device, auto
 * dropped), so the sheet appears and disappears on its own.
 */
export function IncomingCall({ onAccepted }: IncomingCallProps = {}) {
  const { client, activeCall } = useVideoContext();
  const [ringingCall, setRingingCall] = useState<Call | null>(null);
  const [timeLeft, setTimeLeft] = useState(INCOMING_TIMEOUT_S);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'accepting' | 'declining' | null>(null);
  const ringingRef = useRef<Call | null>(null);
  const handledRef = useRef<Set<string>>(new Set());

  // Attach to whichever client exists now — and re-attach when it changes.
  useEffect(() => {
    if (!client) {
      setRingingCall(null);
      return;
    }
    const perCall = new Map<string, { unsubscribe: () => void }>();
    let calls: Call[] = [];

    const recompute = () => {
      const next = calls.find((c) => isIncomingRing(c) && !handledRef.current.has(c.cid)) ?? null;
      const prev = ringingRef.current;
      if (prev && prev !== next && !handledRef.current.has(prev.cid)) {
        // Stopped ringing without us answering: caller hung up or it timed out
        const name = prev.state.createdBy?.name || 'Someone';
        const me = client.state.connectedUser?.id;
        const answeredElsewhere = !!(me && prev.state.session?.accepted_by?.[me]);
        if (
          !answeredElsewhere &&
          prev.state.callingState !== CallingState.JOINED &&
          prev.state.callingState !== CallingState.JOINING
        ) {
          showInfo(`Missed call from ${name}`);
        }
      }
      if (prev !== next) {
        ringingRef.current = next;
        setRingingCall(next);
        setTimeLeft(INCOMING_TIMEOUT_S);
        setActionError(null);
        setBusy(null);
      }
    };

    const sub = client.state.calls$.subscribe((list) => {
      calls = list;
      const live = new Set(list.map((c) => c.cid));
      for (const [cid, s] of perCall) {
        if (!live.has(cid)) {
          s.unsubscribe();
          perCall.delete(cid);
        }
      }
      for (const call of list) {
        if (perCall.has(call.cid)) continue;
        perCall.set(call.cid, call.state.callingState$.subscribe(() => recompute()));
      }
      recompute();
    });

    return () => {
      sub.unsubscribe();
      for (const s of perCall.values()) s.unsubscribe();
    };
  }, [client]);

  // Ringtone while the sheet is up
  useEffect(() => {
    if (!ringingCall || busy === 'accepting') return;
    return playIncomingRingtone();
  }, [ringingCall, busy]);

  const decline = useCallback(async (reason: 'decline' | 'timeout' | 'busy' = 'decline') => {
    const call = ringingRef.current;
    if (!call) return;
    handledRef.current.add(call.cid);
    setBusy('declining');
    try {
      // leave({ reject }) both rejects the ring and cleans the call out of the store
      await call.leave({ reject: true, reason });
    } catch (err) {
      console.warn('[IncomingCall] decline failed:', err);
    } finally {
      ringingRef.current = null;
      setRingingCall(null);
      setBusy(null);
    }
  }, []);

  // Countdown; at zero the ring counts as missed
  useEffect(() => {
    if (!ringingCall || busy) return;
    if (timeLeft <= 0) {
      const name = ringingCall.state.createdBy?.name || 'Someone';
      void decline('timeout').then(() => showInfo(`Missed call from ${name}`));
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [ringingCall, timeLeft, busy, decline]);

  // Already on a call: tell the new caller we're busy
  useEffect(() => {
    if (ringingCall && activeCall && activeCall.cid !== ringingCall.cid) {
      void decline('busy');
    }
  }, [ringingCall, activeCall, decline]);

  const accept = async () => {
    const call = ringingRef.current;
    if (!call || busy) return;
    setBusy('accepting');
    setActionError(null);

    const media = await probeMedia();
    if (!media.audio) {
      setActionError(media.error?.message ?? 'Microphone access is required to join.');
      setBusy(null);
      return; // keep ringing so they can fix permissions and try again
    }

    handledRef.current.add(call.cid);
    try {
      if (!media.video) await call.camera.disable().catch(() => {});
      // join() on a ringing call also accepts it, which tells the caller's
      // SDK to join; calling accept() separately raced with it.
      await call.join();
      onAccepted?.(call);
      ringingRef.current = null;
      setRingingCall(null);
      setBusy(null);
    } catch (err) {
      console.error('[IncomingCall] join failed:', err);
      handledRef.current.delete(call.cid);
      if (call.state.callingState === CallingState.LEFT || call.state.callingState === CallingState.IDLE) {
        showInfo('The call ended before you could join.');
        ringingRef.current = null;
        setRingingCall(null);
        setBusy(null);
        return;
      }
      setActionError(callErrorMessage(err));
      setBusy(null);
    }
  };

  if (!ringingCall) return null;

  const createdBy = ringingCall.state.createdBy;
  const callerName = createdBy?.name || 'Someone';
  const callerImage = createdBy?.image;
  const subject = (ringingCall.state.custom as { subject?: string } | undefined)?.subject;

  return (
    <div
      role="alertdialog"
      aria-labelledby="incoming-call-title"
      className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
    >
      <div className="w-full max-w-sm rounded-[2.5rem] bg-card border border-border/50 shadow-2xl p-8 flex flex-col items-center text-center space-y-6 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
          <div className="absolute w-40 h-40 bg-primary/20 rounded-full animate-ping [animation-duration:2s]" />
          <div className="absolute w-56 h-56 border border-primary/20 rounded-full animate-ping [animation-duration:3s]" />
        </div>

        {callerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={callerImage}
            alt=""
            className="relative z-10 w-24 h-24 rounded-full object-cover shadow-lg shadow-primary/20"
          />
        ) : (
          <div className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-br from-primary to-coral flex items-center justify-center text-white text-4xl font-semibold shadow-lg shadow-primary/20">
            {callerName.charAt(0).toUpperCase() || '?'}
          </div>
        )}

        <div className="space-y-1 relative z-10">
          <p id="incoming-call-title" className="text-2xl font-semibold">{callerName}</p>
          <p className="text-sm text-muted-foreground">
            Incoming video call{subject ? ` · ${subject}` : ''}
          </p>
        </div>

        {actionError && (
          <p className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-xl relative z-10 w-full text-left">
            {actionError}
          </p>
        )}

        <p className="text-xs text-muted-foreground/60 relative z-10">
          {busy === 'accepting'
            ? 'Connecting…'
            : busy === 'declining'
              ? 'Declining…'
              : `Ringing · ${timeLeft}s`}
        </p>

        <div className="flex items-center gap-4 w-full relative z-10">
          <button
            onClick={() => void decline('decline')}
            disabled={!!busy}
            className="flex-1 h-14 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <PhoneOff className="h-4 w-4" /> Decline
          </button>
          <button
            onClick={accept}
            disabled={!!busy}
            className="flex-1 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {busy === 'accepting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
            {busy === 'accepting' ? 'Joining…' : actionError ? 'Try again' : 'Accept'}
          </button>
        </div>
      </div>
    </div>
  );
}
