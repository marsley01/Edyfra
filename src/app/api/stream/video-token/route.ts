// IMPORTANT: Before this works you must:
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

import { StreamClient } from '@stream-io/node-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import prisma from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_STREAM_KEY;
    const secret = process.env.STREAM_SECRET;

    if (!apiKey || !secret) {
      return NextResponse.json(
        { error: 'Stream not configured' },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = user.id;

    // Get the user's display name from the database
    const profile = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const userName = profile?.name || user.email?.split('@')[0] || 'Edyfra User';

    const client = new StreamClient(apiKey, secret);

    // Upsert the user in Stream first so they exist before token is issued
    await client.upsertUsers([
      {
        id: userId,
        name: userName,
        role: 'user',
      },
    ]);

    // Generate token valid for 1 hour
    const token = client.generateUserToken({
      user_id: userId,
      validity_in_seconds: 3600,
    });

    console.log('[stream/video-token] Token generated for:', userId);

    return NextResponse.json({
      token,
      userId,
      userName,
      apiKey,
    });
  } catch (err: any) {
    console.error('[stream/video-token] Token generation failed:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
