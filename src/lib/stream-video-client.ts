import { StreamVideoClient } from '@stream-io/video-react-sdk';

let client: StreamVideoClient | null = null;
let clientUserId: string | null = null;
let pendingPromise: Promise<StreamVideoClient | null> | null = null;

interface VideoTokenData {
  token: string;
  userId: string;
  userName: string;
  apiKey: string;
}

async function fetchVideoToken(): Promise<VideoTokenData> {
  const res = await fetch('/api/stream/video-token', {
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 503 && body.includes('not configured')) {
      throw new Error('STREAM_NOT_CONFIGURED');
    }
    throw new Error(`Failed to get video token (${res.status}): ${body}`);
  }
  return res.json();
}

export async function getStreamVideoClient(): Promise<StreamVideoClient | null> {
  if (pendingPromise) return pendingPromise;

  pendingPromise = (async () => {
    let tokenData: VideoTokenData;

    try {
      tokenData = await fetchVideoToken();
      console.log('[stream-video-client] Token fetched for user:', tokenData.userId);
    } catch (err) {
      if (err instanceof Error && err.message === 'STREAM_NOT_CONFIGURED') {
        console.log('[stream-video-client] Video not available — Stream API keys not configured');
      } else {
        console.error('[stream-video-client] Failed to get video token:', err);
      }
      pendingPromise = null;
      return null;
    }

    const { userId, userName, apiKey, token } = tokenData;

    if (client && clientUserId === userId) {
      console.log('[stream-video-client] Re-using existing client for:', userId);
      pendingPromise = null;
      return client;
    }

    if (client && clientUserId !== userId) {
      console.log('[stream-video-client] User changed — disconnecting old client');
      try {
        await client.disconnectUser();
      } catch {}
      client = null;
      clientUserId = null;
    }

    client = new StreamVideoClient({
      apiKey,
      user: { id: userId, name: userName },
      token,
      tokenProvider: async () => {
        console.log('[stream-video-client] Refreshing video token...');
        const data = await fetchVideoToken();
        return data.token;
      },
      options: {
        defaultWsTimeout: 20000,
        logger: (logLevel, message, ...args) => {
          if (logLevel === 'error' || logLevel === 'warn') {
            console.warn(`[StreamVideo][${logLevel}]`, message, ...args);
          }
        },
      },
    });

    clientUserId = userId;
    pendingPromise = null;
    console.log('[stream-video-client] ✅ New client created for user:', userId);
    return client;
  })();

  return pendingPromise;
}

export async function disconnectVideoClient(): Promise<void> {
  if (client) {
    try {
      await client.disconnectUser();
      console.log('[stream-video-client] Client disconnected');
    } catch (err) {
      console.error('[stream-video-client] Disconnect error:', err);
    } finally {
      client = null;
      clientUserId = null;
    }
  }
}
