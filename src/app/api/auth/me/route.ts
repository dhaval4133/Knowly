
'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, ObjectId, WithId } from 'mongodb';
import { cookies } from 'next/headers';

interface UserDBDocument extends WithId<Document> {
  _id: ObjectId;
  name: string;
  email?: string;
  avatarUrl?: string;
  activeSessionToken?: string;
  bookmarkedQuestionIds?: ObjectId[];
  bio?: string; // Added bio field
}

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable for "me" route');
}
if (!MONGODB_DB_NAME) {
 throw new Error('Please define the MONGODB_DB_NAME environment variable for "me" route');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    try {
      await cachedClient.db(MONGODB_DB_NAME).command({ ping: 1 });
      return cachedDb;
    } catch (e) {
      console.warn('Cached MongoDB connection lost for "me" route, attempting to reconnect...', e);
      cachedClient = null;
      cachedDb = null;
    }
  }

  if (!cachedClient) {
    if (!MONGODB_URI) {
      console.error('CRITICAL: MONGODB_URI is not defined at connectToDatabase call for "me" route.');
      throw new Error('MONGODB_URI is not defined. This should have been caught by top-level check.');
    }
    cachedClient = new MongoClient(MONGODB_URI);
    try {
      await cachedClient.connect();
    } catch (err) {
      console.error('Failed to connect to MongoDB for "me" route:', err);
      cachedClient = null;
      throw err;
    }
  }

  cachedDb = cachedClient.db(MONGODB_DB_NAME);
  return cachedDb;
}

function clearAuthCookies() {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: -1, // Expire immediately
    path: '/',
    sameSite: 'lax' as 'lax' | 'strict' | 'none' | undefined,
  };
  cookies().set('knowly-session-id', '', cookieOptions);
  cookies().set('knowly-active-token', '', cookieOptions);
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const userIdCookie = cookieStore.get('knowly-session-id');
    const activeTokenCookie = cookieStore.get('knowly-active-token');

    if (!userIdCookie || !userIdCookie.value || !activeTokenCookie || !activeTokenCookie.value) {
      if (userIdCookie?.value || activeTokenCookie?.value) clearAuthCookies();
      return NextResponse.json({ success: false, user: null, message: 'Not authenticated. Missing session cookies.' }, { status: 401 });
    }

    const userId = userIdCookie.value;
    const sessionTokenFromCookie = activeTokenCookie.value;

    if (!ObjectId.isValid(userId)) {
        clearAuthCookies();
        return NextResponse.json({ success: false, user: null, message: 'Invalid user session identifier.' }, { status: 401 });
    }

    const db = await connectToDatabase();
    const usersCollection = db.collection<UserDBDocument>('users');

    const user = await usersCollection.findOne(
        { _id: new ObjectId(userId) },
        { projection: { password: 0 } } // Ensure password is not sent
    );

    if (!user) {
      clearAuthCookies();
      return NextResponse.json({ success: false, user: null, message: 'User not found or session invalid (user missing).' }, { status: 401 });
    }

    if (user.activeSessionToken !== sessionTokenFromCookie) {
      clearAuthCookies();
      console.log(`Stale session for user ${userId}. Cookie token: ${sessionTokenFromCookie}, DB token: ${user.activeSessionToken}`);
      return NextResponse.json({ success: false, user: null, message: 'Session expired or logged out from another device.' }, { status: 401 });
    }

    return NextResponse.json({
        success: true,
        user: {
            userId: user._id.toString(),
            userName: user.name,
            avatarUrl: user.avatarUrl,
            bookmarkedQuestionIds: (user.bookmarkedQuestionIds || []).map(id => id.toString()),
            bio: user.bio, // Include bio
        }
    }, { status: 200 });

  } catch (error) {
    console.error('"Me" API error:', error);
    let errorMessage = 'An internal server error occurred while fetching session.';
    let errorStatus = 500;

     if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Failed to connect to the database for "me" route. Please check your connection string and ensure the database server is running.';
        errorStatus = 503;
      } else if (error.message.includes('querySrv ESERVFAIL') || error.message.includes('queryTxt ESERVFAIL')) {
        errorMessage = 'Database connection failed for "me" route: DNS resolution error. Check your MongoDB URI and network settings.';
        errorStatus = 503;
      } else if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
        errorMessage = 'Database connection failed for "me" route: Authentication error. Check your MongoDB credentials.';
        errorStatus = 503;
      }
    }
    return NextResponse.json({ success: false, user:null, message: errorMessage }, { status: errorStatus });
  }
}
