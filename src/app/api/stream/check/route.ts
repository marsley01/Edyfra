import { NextResponse } from 'next/server';

// IMPORTANT: Before video calls work you must:
// 1. Go to dashboard.getstream.io
// 2. Select your app
// 3. Go to Video & Audio section
// 4. Make sure "default" call type exists
// 5. Disable "Backstage mode" (under settings) unless you explicitly use it.
// 6. Enable the following permissions on the "default" call type:
//    - Send audio: all participants
//    - Send video: all participants
//    - Create call: all participants
//    - Join call: all participants
//    - End call: all participants
// 7. Save the configuration

export async function GET() {
  const hasApiKey = !!process.env.NEXT_PUBLIC_STREAM_KEY;
  const hasSecret = !!process.env.STREAM_SECRET;
  const allPresent = hasApiKey && hasSecret;

  return NextResponse.json({
    status: allPresent ? "ok" : "missing_keys",
    configured: allPresent,
  });
}
