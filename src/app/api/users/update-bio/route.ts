
// Use server directive for Next.js App Router API routes
'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { cookies } from 'next/headers';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable for bio update');
}
if (!MONGODB_DB_NAME) {
 throw new Error('Please define the MONGODB_DB_NAME environment variable for bio update');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    try {
      await cachedClient.db(MONGODB_DB_NAME).command({ ping: 1 });
      return cachedDb;
    } catch (e) {
      console.warn('Cached MongoDB connection lost for bio update, attempting to reconnect...', e);
      cachedClient = null;
      cachedDb = null;
    }
  }

  if (!cachedClient) {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined at connectToDatabase call for bio update.');
    }
    cachedClient = new MongoClient(MONGODB_URI);
    try {
      await cachedClient.connect();
      console.log('MongoDB connected successfully for bio update.');
    } catch (err) {
      console.error('Failed to connect to MongoDB for bio update:', err);
      cachedClient = null;
      throw err;
    }
  }
  cachedDb = cachedClient.db(MONGODB_DB_NAME);
  return cachedDb;
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const sessionIdCookie = cookieStore.get('knowly-session-id');
    const activeTokenCookie = cookieStore.get('knowly-active-token');

    if (!sessionIdCookie || !sessionIdCookie.value || !activeTokenCookie || !activeTokenCookie.value) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Please log in to update your bio.' }, { status: 401 });
    }

    const loggedInUserIdString = sessionIdCookie.value;
    if (!ObjectId.isValid(loggedInUserIdString)) {
        return NextResponse.json({ success: false, message: 'Invalid user session.' }, { status: 401 });
    }
    const loggedInUserObjectId = new ObjectId(loggedInUserIdString);

    const { bio } = await req.json();

    if (typeof bio !== 'string') {
      return NextResponse.json({ success: false, message: 'Bio must be a string.' }, { status: 400 });
    }
    // Allow empty bio, but trim it. Max length could be enforced here.
    const newBio = bio.trim();
    if (newBio.length > 500) { // Example max length
        return NextResponse.json({ success: false, message: 'Bio is too long (max 500 characters).' }, { status: 400 });
    }
    
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Validate active session token
    const user = await usersCollection.findOne({ _id: loggedInUserObjectId });
    if (!user || user.activeSessionToken !== activeTokenCookie.value) {
      // Clear auth cookies if session is invalid
      const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: -1, path: '/', sameSite: 'lax' as 'lax' | 'strict' | 'none' | undefined, };
      cookies().set('knowly-session-id', '', cookieOptions);
      cookies().set('knowly-active-token', '', cookieOptions);
      return NextResponse.json({ success: false, message: 'Session expired or invalid. Please log in again.' }, { status: 401 });
    }

    const result = await usersCollection.updateOne(
      { _id: loggedInUserObjectId },
      { $set: { bio: newBio, updatedAt: new Date() } } 
    );

    if (result.modifiedCount > 0 || result.matchedCount > 0) { // matchedCount > 0 means bio might be the same
      return NextResponse.json({ 
        success: true, 
        message: 'Bio updated successfully!'
      }, { status: 200 });
    }
    else {
      // This case (user not found) should ideally be caught by session validation.
      console.error('Bio update failed. User not found or not updated.');
      return NextResponse.json({ success: false, message: 'Failed to update bio. User not found.' }, { status: 404 });
    }

  } catch (error) {
    console.error('Bio update API error:', error);
    let errorMessage = 'An internal server error occurred during bio update.';
    let errorStatus = 500;

    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv ESERVFAIL') || error.message.includes('queryTxt ESERVFAIL') || error.message.includes('bad auth')) {
        errorMessage = 'Database connection issue. Please try again later.';
        errorStatus = 503;
      }
    }
    return NextResponse.json({ success: false, message: errorMessage }, { status: errorStatus });
  }
}
