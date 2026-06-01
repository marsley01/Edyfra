import { NextRequest, NextResponse } from 'next/server';
import { getUserData } from '@/app/actions/user';

export async function GET(request: NextRequest) {
  try {
    const userData = await getUserData();
    
    if (!userData) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: userData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('User data API error:', error);
    return NextResponse.json(
      { error: 'Failed to load user data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}