
'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { cookies } from 'next/headers';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable for unbookmarking');
}
if (!MONGODB_DB_NAME) {
 throw new Error('Please define the MONGODB_DB_NAME environment variable for unbookmarking');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    try {
      await cachedClient.db(MONGODB_DB_NAME).command({ ping: 1 });
      return cachedDb;
    } catch (e) {
      console.warn('Cached MongoDB connection lost for unbookmarking, attempting to reconnect...', e);
      cachedClient = null;
      cachedDb = null;
    }
  }

  if (!cachedClient) {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined at connectToDatabase call for unbookmarking.');
    }
    cachedClient = new MongoClient(MONGODB_URI);
    try {
      await cachedClient.connect();
    } catch (err) {
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
      return NextResponse.json({ success: false, message: 'Unauthorized. Please log in to unbookmark questions.' }, { status: 401 });
    }

    const loggedInUserIdString = sessionIdCookie.value;
    if (!ObjectId.isValid(loggedInUserIdString)) {
        return NextResponse.json({ success: false, message: 'Invalid user session.' }, { status: 401 });
    }
    const loggedInUserObjectId = new ObjectId(loggedInUserIdString);

    const { questionId } = await req.json();

    if (!questionId || !ObjectId.isValid(questionId)) {
      return NextResponse.json({ success: false, message: 'Valid question ID is required.' }, { status: 400 });
    }
    const questionObjectIdToUnbookmark = new ObjectId(questionId);

    const db = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Validate active session token (optional but good for security)
    const user = await usersCollection.findOne({ _id: loggedInUserObjectId });
    if (!user || user.activeSessionToken !== activeTokenCookie.value) {
      return NextResponse.json({ success: false, message: 'Session expired or invalid. Please log in again.' }, { status: 401 });
    }

    const result = await usersCollection.updateOne(
      { _id: loggedInUserObjectId },
      { $pull: { bookmarkedQuestionIds: questionObjectIdToUnbookmark } }
    );

    if (result.modifiedCount > 0 || result.matchedCount > 0) {
      return NextResponse.json({
        success: true,
        message: 'Question unbookmarked successfully!',
        isBookmarked: false // Explicitly state the new status
      }, { status: 200 });
    } else {
      return NextResponse.json({ success: false, message: 'Failed to unbookmark question. User not found or question was not bookmarked.' }, { status: 404 });
    }

  } catch (error) {
    console.error('Unbookmark API error:', error);
    let errorMessage = 'An internal server error occurred during unbookmarking.';
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
