
// Use server directive for Next.js App Router API routes
'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { cookies } from 'next/headers';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable for avatar update');
}
if (!MONGODB_DB_NAME) {
 throw new Error('Please define the MONGODB_DB_NAME environment variable for avatar update');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    try {
      await cachedClient.db(MONGODB_DB_NAME).command({ ping: 1 });
      return cachedDb;
    } catch (e) {
      console.warn('Cached MongoDB connection lost for avatar update, attempting to reconnect...', e);
      cachedClient = null;
      cachedDb = null;
    }
  }

  if (!cachedClient) {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined at connectToDatabase call for avatar update.');
    }
    cachedClient = new MongoClient(MONGODB_URI);
    try {
      await cachedClient.connect();
      console.log('MongoDB connected successfully for avatar update.');
    } catch (err) {
      console.error('Failed to connect to MongoDB for avatar update:', err);
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

    if (!sessionIdCookie || !sessionIdCookie.value) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const loggedInUserIdString = sessionIdCookie.value;
    if (!ObjectId.isValid(loggedInUserIdString)) {
        return NextResponse.json({ success: false, message: 'Invalid user session.' }, { status: 401 });
    }
    const loggedInUserObjectId = new ObjectId(loggedInUserIdString);

    const { avatarUrl } = await req.json(); // This will now be a Data URI string

    if (typeof avatarUrl !== 'string' || !avatarUrl.startsWith('data:image/')) {
      return NextResponse.json({ success: false, message: 'Avatar URL must be a valid Data URI string for an image.' }, { status: 400 });
    }
    
    // Basic check for excessively large Data URIs (e.g., > 5MB)
    // MongoDB has a 16MB limit per document, but embedding large images is inefficient.
    // This is a soft limit; adjust as needed. Max typical BSON document size is 16MB.
    // A 5MB Data URI is ~3.7MB of binary data. Still very large for a DB field.
    const MAX_DATA_URI_LENGTH = 5 * 1024 * 1024; // 5 MB approx
    if (avatarUrl.length > MAX_DATA_URI_LENGTH) {
        return NextResponse.json({ success: false, message: 'Image file is too large. Please use a smaller image.' }, { status: 413 }); // 413 Payload Too Large
    }
    
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');

    const result = await usersCollection.updateOne(
      { _id: loggedInUserObjectId },
      { $set: { avatarUrl: avatarUrl, updatedAt: new Date() } } 
    );

    if (result.modifiedCount > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Profile picture updated successfully!'
      }, { status: 200 });
    } else if (result.matchedCount > 0 && result.modifiedCount === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Profile picture is already set to this image.'
      }, { status: 200 });
    }
    else {
      console.error('Avatar update failed. User not found or not updated.');
      return NextResponse.json({ success: false, message: 'Failed to update profile picture. User not found.' }, { status: 404 });
    }

  } catch (error) {
    console.error('Avatar update API error:', error);
    let errorMessage = 'An internal server error occurred during avatar update.';
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
