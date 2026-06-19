import { StreamVideoClient } from '@stream-io/video-react-sdk';

let client: StreamVideoClient | null = null;
let clientUserId: string | null = null;

export async function getStreamVideoClient(): Promise<StreamVideoClient | null> {
  // Fetch a fresh token (the endpoint is idempotent for the same user)
  const res = await fetch('/api/stream/video-token', {
    credentials: 'include',
  });

  if (!res.ok) {
    console.error('[stream-video-client] Failed to get video token:', res.status);
    return null;
  }

  const { token, userId, userName, apiKey } = await res.json();

  // If already initialized for this user, reuse the existing client
  if (client && clientUserId === userId) {
    return client;
  }

  // Disconnect previous client if user has changed
  if (client && clientUserId !== userId) {
    try {
      await client.disconnectUser();
    } catch {
      /* noop */
    }
    client = null;
  }

  // Create a new client
  client = new StreamVideoClient({
    apiKey,
    user: { id: userId, name: userName },
    token,
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
