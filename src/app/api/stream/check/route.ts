import { NextResponse } from 'next/server';

// IMPORTANT: Before video calls work you must:
// 1. Go to dashboard.getstream.io
// 2. Select your app
// 3. Go to Video & Audio section
// 4. Make sure "default" call type exists
// 5. Enable the following permissions on the "default" call type:
//    - Send audio: all participants
//    - Send video: all participants
//    - Create call: all participants
//    - Join call: all participants
//    - End call: all participants
// 6. Save the configuration

export async function GET() {
  const checks = {
    hasApiKey: !!process.env.NEXT_PUBLIC_STREAM_KEY,
    hasSecret: !!process.env.STREAM_SECRET,
    apiKeyLength: process.env.NEXT_PUBLIC_STREAM_KEY?.length,
    secretLength: process.env.STREAM_SECRET?.length,
  };

  const allPresent = checks.hasApiKey && checks.hasSecret;

  return NextResponse.json({
    status: allPresent ? 'ok' : 'missing_keys',
    checks,
  });
}
