import { StreamVideoClient } from '@stream-io/video-react-sdk';

let client: StreamVideoClient | null = null;
let clientUserId: string | null = null;

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
    throw new Error(`Failed to get video token (${res.status}): ${body}`);
  }
  return res.json();
}

export async function getStreamVideoClient(): Promise<StreamVideoClient | null> {
  let tokenData: VideoTokenData;

  try {
    tokenData = await fetchVideoToken();
    console.log('[stream-video-client] Token fetched for user:', tokenData.userId);
  } catch (err) {
    console.error('[stream-video-client] Failed to get video token:', err);
    return null;
  }

  const { userId, userName, apiKey, token } = tokenData;

  // Re-use existing client if same user
  if (client && clientUserId === userId) {
    console.log('[stream-video-client] Re-using existing client for:', userId);
    return client;
  }

  // Disconnect old client if user changed
  if (client && clientUserId !== userId) {
    console.log('[stream-video-client] User changed — disconnecting old client');
    try {
      await client.disconnectUser();
    } catch {
      /* noop */
    }
    client = null;
    clientUserId = null;
  }

  // Create new client — pass the token directly for initial auth, AND
  // provide a tokenProvider for background token refresh.
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
  console.log('[stream-video-client] ✅ New client created for user:', userId);

  return client;
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
