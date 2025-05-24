
'use server';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
// import { MongoClient, Db, ObjectId } from 'mongodb'; // Optional: for clearing activeSessionToken in DB

// const MONGODB_URI = process.env.MONGODB_URI;
// const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

// Optional: Database connection for clearing activeSessionToken
/*
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase() {
  // ... (standard connectToDatabase logic if needed)
}
*/

export async function POST() {
  try {
    console.log('Logout attempt received.');
    const cookieStore = cookies();
    // const userIdCookie = cookieStore.get('knowly-session-id'); // Optional: if clearing DB token

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: -1, // Expire immediately
      path: '/',
      sameSite: 'lax' as 'lax' | 'strict' | 'none' | undefined,
    };

    cookieStore.set('knowly-session-id', '', cookieOptions);
    cookieStore.set('knowly-active-token', '', cookieOptions);
    
    console.log('Session cookies (knowly-session-id, knowly-active-token) cleared for logout.');

    // Optional: Clear activeSessionToken in the database
    /*
    if (userIdCookie && userIdCookie.value && MONGODB_URI && MONGODB_DB_NAME) {
      try {
        const db = await connectToDatabase();
        if (db && ObjectId.isValid(userIdCookie.value)) {
          const usersCollection = db.collection('users');
          await usersCollection.updateOne(
            { _id: new ObjectId(userIdCookie.value) },
            { $unset: { activeSessionToken: "" } }
          );
          console.log(`Cleared activeSessionToken in DB for user ${userIdCookie.value}`);
        }
      } catch (dbError) {
        console.error('Error clearing activeSessionToken in DB during logout:', dbError);
        // Don't let DB error prevent cookie logout
      }
    }
    */

    return NextResponse.json({ success: true, message: 'Logged out successfully.' }, { status: 200 });
  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json({ success: false, message: 'An internal server error occurred during logout.' }, { status: 500 });
  }
}
