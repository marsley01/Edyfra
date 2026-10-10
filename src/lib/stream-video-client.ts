'use client';

import { CallingState, StreamVideoClient, type User } from '@stream-io/video-react-sdk';

/**
 * One Stream Video client per signed-in user, shared by every VideoProvider.
 *
 * - The user id is the PRISMA user id returned by /api/stream/video-token
 *   (the same id chat uses and the id call members are rung by).
 * - Auth uses a tokenProvider, so the SDK refreshes expired tokens itself.
 * - Subscribers are told whenever the client appears, changes or goes away,
 *   so components that mounted before the client existed (IncomingCall) can
 *   attach their listeners later.
 * - Back/forward cache: on `pagehide` (persisted) the socket is closed
 *   cleanly; on `pageshow` (persisted) the user is reconnected.
 */

interface VideoTokenData {
  token: string;
  userId: string;
  userName: string;
  userImage?: string | null;
  apiKey: string;
  expiresAt?: number;
}

type Listener = (client: StreamVideoClient | null) => void;

let client: StreamVideoClient | null = null;
let clientUser: User | null = null;
let pending: Promise<StreamVideoClient | null> | null = null;
/**
 * In-flight resetVideoClient teardown. The SDK keeps a client in its instance
 * map until disconnectUser() finishes, so getOrCreateInstance() for the same
 * user during a teardown (sign out, then straight back in) would hand back
 * the dying client. New clients are only created once this settles.
 */
let teardown: Promise<void> | null = null;
/** Bumped by every reset, so an init that started before it is discarded. */
let generation = 0;
let suspended = false;
let lifecycleBound = false;
/** Token fetched during init, handed to the SDK on its first tokenProvider call. */
let primedToken: { token: string; expiresAt: number } | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) {
    try {
      l(client);
    } catch (err) {
      console.error('[stream-video-client] listener failed:', err);
    }
  }
}

export function subscribeVideoClient(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCurrentVideoClient(): StreamVideoClient | null {
  return client;
}

class StreamNotConfiguredError extends Error {}
class NotAuthenticatedError extends Error {}

async function fetchVideoToken(): Promise<VideoTokenData> {
  const res = await fetch('/api/stream/video-token', {
    credentials: 'include',
    cache: 'no-store',
  });
  if (res.status === 503) throw new StreamNotConfiguredError('Stream not configured');
  if (res.status === 401) throw new NotAuthenticatedError('Not authenticated');
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to get video token (${res.status}): ${body}`);
  }
  return res.json();
}

/** Used by the SDK on connect and whenever its token expires. */
async function tokenProvider(): Promise<string> {
  // Reuse the token fetched during init if it has >2 minutes left
  if (primedToken && primedToken.expiresAt - Date.now() > 120_000) {
    const { token } = primedToken;
    primedToken = null;
    return token;
  }
  primedToken = null;
  const data = await fetchVideoToken();
  if (clientUser && data.userId !== clientUser.id) {
    // Someone else signed in in another tab; never hand this socket their token
    void resetVideoClient();
    throw new Error('Signed-in user changed');
  }
  return data.token;
}

function hasJoinedCall(c: StreamVideoClient): boolean {
  return c.state.calls.some((call) => {
    const s = call.state.callingState;
    return (
      s === CallingState.JOINED ||
      s === CallingState.JOINING ||
      s === CallingState.RECONNECTING ||
      s === CallingState.MIGRATING
    );
  });
}

function bindLifecycle() {
  if (lifecycleBound || typeof window === 'undefined') return;
  lifecycleBound = true;

  // Page going into the back/forward cache: close the socket ourselves so the
  // server doesn't see an abnormal 1006 close and the page stays cacheable.
  window.addEventListener('pagehide', (e: PageTransitionEvent) => {
    if (!e.persisted || !client || !clientUser) return;
    suspended = true;
    const c = client;
    void (async () => {
      for (const call of [...c.state.calls]) {
        await call.leave({ reject: call.ringing, reason: 'cancel' }).catch(() => {});
      }
      await c.disconnectUser().catch(() => {});
    })();
  });

  window.addEventListener('pageshow', (e: PageTransitionEvent) => {
    if (!e.persisted) return;
    void resumeVideoClient();
  });

  // Coming back to a tab whose socket died (sleep, network change) — reconnect.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (suspended || (client && clientUser && !client.state.connectedUser)) {
      void resumeVideoClient();
    }
  });

  window.addEventListener('online', () => {
    if (client && clientUser && !client.state.connectedUser) void resumeVideoClient();
  });
}

async function resumeVideoClient(): Promise<void> {
  if (!client || !clientUser) {
    suspended = false;
    return;
  }
  const c = client;
  const user = clientUser;
  try {
    if (!c.state.connectedUser) {
      await c.connectUser(user, tokenProvider);
    }
    suspended = false;
    emit();
  } catch (err) {
    console.warn('[stream-video-client] reconnect failed, recreating client:', err);
    // Fall back to a fresh client (e.g. the token's user changed). Tear the
    // old one down properly first: the SDK would otherwise hand the same
    // broken instance back from getOrCreateInstance. (The reset also clears
    // `pending`, so this can't deadlock when called from inside an init.)
    await resetVideoClient();
    await getStreamVideoClient();
  }
}

/**
 * Returns the connected client for the signed-in user, creating it if
 * needed. Concurrent callers share one in-flight init (StrictMode safe).
 * Returns null when Stream isn't configured or nobody is signed in.
 */
export function getStreamVideoClient(): Promise<StreamVideoClient | null> {
  if (pending) return pending;

  let gen = generation;
  let initPromise: Promise<StreamVideoClient | null>;

  initPromise = (async () => {
    // Never reuse (or race) a client that is still being torn down
    while (teardown) await teardown;
    if (gen !== generation) return null;

    let data: VideoTokenData;
    try {
      data = await fetchVideoToken();
    } catch (err) {
      if (err instanceof StreamNotConfiguredError) {
        console.info('[stream-video-client] Video unavailable: Stream keys not configured');
      } else if (!(err instanceof NotAuthenticatedError)) {
        console.error('[stream-video-client] Failed to get video token:', err);
      }
      return client && !(err instanceof NotAuthenticatedError) ? client : null;
    }
    // Signed out (reset) while the token was in flight: don't resurrect
    if (gen !== generation) return null;

    if (client && clientUser?.id === data.userId) {
      if (suspended || !client.state.connectedUser) await resumeVideoClient();
      return client;
    }

    if (client) {
      // Different user than the one connected: tear the old one down first.
      // That reset is ours, so keep this init current and shared.
      await resetVideoClient();
      gen = generation;
      pending = initPromise!;
    }
    while (teardown) await teardown;
    // A sign-out happened meanwhile
    if (gen !== generation) return null;

    const user: User = {
      id: data.userId,
      name: data.userName,
      image: data.userImage || undefined,
    };
    primedToken = { token: data.token, expiresAt: data.expiresAt ?? Date.now() + 55 * 60_000 };

    // getOrCreateInstance returns the existing instance for this user (HMR,
    // remounts) instead of opening a second socket.
    const next = StreamVideoClient.getOrCreateInstance({
      apiKey: data.apiKey,
      user,
      tokenProvider,
      options: {
        // Auto-reject a second ring while already on a call
        rejectCallWhenBusy: true,
        logLevel: 'warn',
      },
    });

    client = next;
    clientUser = user;
    suspended = false;
    bindLifecycle();
    emit();
    return next;
  })().finally(() => {
    if (pending === initPromise) pending = null;
  });

  pending = initPromise;

  return initPromise;
}
/** Leaves any calls, closes the socket and forgets the client (logout). */
export async function resetVideoClient(): Promise<void> {
  const c = client;
  client = null;
  clientUser = null;
  primedToken = null;
  suspended = false;
  generation++;
  // An init that started before this reset must not be handed to new callers
  pending = null;
  emit();
  if (!c) {
    if (teardown) await teardown;
    return;
  }
  const t: Promise<void> = (async () => {
    try {
      for (const call of [...c.state.calls]) {
        await call.leave({ reject: call.ringing, reason: 'cancel' }).catch(() => {});
      }
      await c.disconnectUser();
    } catch (err) {
      console.error('[stream-video-client] Disconnect error:', err);
    }
  })();
  const prev = teardown;
  const all: Promise<void> = Promise.all([prev, t]).then(() => {
    if (teardown === all) teardown = null;
  });
  teardown = all;
  await all;
}

/** @deprecated use resetVideoClient */
export const disconnectVideoClient = resetVideoClient;

export function isOnActiveCall(): boolean {
  return client ? hasJoinedCall(client) : false;
}
