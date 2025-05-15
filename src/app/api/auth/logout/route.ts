
'use server';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    console.log('Logout attempt received.');
    // Clear the session cookie
    cookies().set('knowly-session-id', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: -1, // Expire the cookie immediately
      path: '/',
      sameSite: 'lax',
    });
    console.log('Session cookie cleared for logout.');
    return NextResponse.json({ success: true, message: 'Logged out successfully.' }, { status: 200 });
  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json({ success: false, message: 'An internal server error occurred during logout.' }, { status: 500 });
  }
}
