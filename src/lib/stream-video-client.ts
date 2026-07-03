import { StreamVideoClient } from '@stream-io/video-react-sdk';

let client: StreamVideoClient | null = null;
let clientUserId: string | null = null;

async function fetchVideoToken() {
  const res = await fetch('/api/stream/video-token', {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Failed to get video token');
  }
  return res.json();
}

export async function getStreamVideoClient(): Promise<StreamVideoClient | null> {
  let tokenData;
  try {
    tokenData = await fetchVideoToken();
  } catch (err) {
    console.error('[stream-video-client] Failed to get video token:', err);
    return null;
  }

  const { userId, userName, apiKey } = tokenData;

  if (client && clientUserId === userId) {
    return client;
  }

  if (client && clientUserId !== userId) {
    try {
      await client.disconnectUser();
    } catch {
      /* noop */
    }
    client = null;
  }

  client = StreamVideoClient.getOrCreateInstance({
    apiKey,
    user: { id: userId, name: userName },
    tokenProvider: async () => {
      const res = await fetch('/api/stream/video-token', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Token refresh failed');
      const data = await res.json();
      return data.token;
    },
    options: {
      defaultWsTimeout: 15000,
    },
  });

  clientUserId = userId;
  console.log('[stream-video-client] Client created for user:', userId);

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
