import { NextRequest, NextResponse } from 'next/server';
import { getUserData } from '@/app/actions/user';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Resolve the session first so "not signed in" (401) is distinguishable
    // from "signed in but the DB lookup failed" (500). getUserData() swallows
    // DB errors and returns null, which used to surface as 401 and bounced
    // signed-in users to /login on any transient DB error.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // getUserData() only ever returns the caller's own record (session-based).
    const userData = await getUserData();

    if (!userData) {
      return NextResponse.json({ error: 'Failed to load user data' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: userData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('User data API error:', error);
    return NextResponse.json(
      { error: 'Failed to load user data' },
      { status: 500 }
    );
  }
}
