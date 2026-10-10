/**
 * Server-side Stream Video client (node SDK, uses the API secret).
 * Not a "use server" module: nothing here is browser-callable.
 */
import { StreamClient } from "@stream-io/node-sdk";

let client: StreamClient | null = null;

export function getStreamVideoServer(): StreamClient | null {
  const key = process.env.NEXT_PUBLIC_STREAM_KEY;
  const secret = process.env.STREAM_SECRET;
  if (!key || !secret) return null;
  if (!client) client = new StreamClient(key, secret);
  return client;
}
