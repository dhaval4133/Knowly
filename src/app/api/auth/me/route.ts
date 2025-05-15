
'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { cookies } from 'next/headers';

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
      // Ping the database to ensure the connection is still alive
      await cachedClient.db(MONGODB_DB_NAME).command({ ping: 1 });
      // console.log('Using cached database instance for "me" route.');
      return cachedDb;
    } catch (e) {
      console.warn('Cached MongoDB connection lost for "me" route, attempting to reconnect...', e);
      cachedClient = null;
      cachedDb = null;
    }
  }

  if (!cachedClient) {
    console.log('No cached client or connection lost for "me" route, creating new MongoClient instance.');
    if (!MONGODB_URI) {
      console.error('CRITICAL: MONGODB_URI is not defined at connectToDatabase call for "me" route.');
      throw new Error('MONGODB_URI is not defined. This should have been caught by top-level check.');
    }
    cachedClient = new MongoClient(MONGODB_URI);
    try {
      console.log('Attempting to connect to MongoDB for "me" route...');
      await cachedClient.connect();
      console.log('MongoDB connected successfully for "me" route.');
    } catch (err) {
      console.error('Failed to connect to MongoDB for "me" route:', err);
      cachedClient = null; // Reset client on connection failure
      throw err;
    }
  }

  if (!MONGODB_DB_NAME) {
    console.error('CRITICAL: MONGODB_DB_NAME is not defined at connectToDatabase call for "me" route.');
    throw new Error('MONGODB_DB_NAME is not defined. This should have been caught by top-level check.');
  }
  console.log(`Getting database for "me" route: ${MONGODB_DB_NAME}`);
  cachedDb = cachedClient.db(MONGODB_DB_NAME);
  return cachedDb;
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const sessionIdCookie = cookieStore.get('knowly-session-id');

    if (!sessionIdCookie || !sessionIdCookie.value) {
      // console.log('No session cookie found for "me" route.');
      return NextResponse.json({ success: false, user: null, message: 'Not authenticated.' }, { status: 401 });
    }

    const userId = sessionIdCookie.value;
    // console.log('Session cookie found, userId:', userId);

    if (!ObjectId.isValid(userId)) {
        console.log('Invalid ObjectId format in session cookie for "me" route:', userId);
        // Clear potentially corrupted cookie
        cookies().set('knowly-session-id', '', { maxAge: -1, path: '/' });
        return NextResponse.json({ success: false, user: null, message: 'Invalid session identifier.' }, { status: 401 });
    }

    const db = await connectToDatabase();
    console.log('Database connection supposedly successful for "me" route for userId:', userId);
    const usersCollection = db.collection('users');

    // console.log('Fetching user from DB for "me" route, userId:', userId);
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } }); // Exclude password

    if (!user) {
      console.log('User not found in DB for "me" route, userId:', userId, '- clearing cookie.');
      // User ID in cookie is invalid or user deleted, clear cookie
      cookies().set('knowly-session-id', '', { maxAge: -1, path: '/' });
      return NextResponse.json({ success: false, user: null, message: 'User not found or session invalid.' }, { status: 401 });
    }

    // console.log('User found for "me" route:', user.name);
    return NextResponse.json({ 
        success: true, 
        user: { 
            userId: user._id.toString(), 
            userName: user.name 
        } 
    }, { status: 200 });

  } catch (error) {
    console.error('"Me" API error:', error);
    let errorMessage = 'An internal server error occurred while fetching session.';
    let errorStatus = 500;

     if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Failed to connect to the database for "me" route. Please check your connection string and ensure the database server is running.';
        errorStatus = 503; // Service Unavailable
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
