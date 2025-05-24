
'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { cookies } from 'next/headers';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable for question deletion');
}
if (!MONGODB_DB_NAME) {
 throw new Error('Please define the MONGODB_DB_NAME environment variable for question deletion');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    try {
      await cachedClient.db(MONGODB_DB_NAME).command({ ping: 1 });
      return cachedDb;
    } catch (e) {
      console.warn('Cached MongoDB connection lost for question deletion, attempting to reconnect...', e);
      cachedClient = null;
      cachedDb = null;
    }
  }

  if (!cachedClient) {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined at connectToDatabase call for question deletion.');
    }
    cachedClient = new MongoClient(MONGODB_URI);
    try {
      await cachedClient.connect();
      console.log('MongoDB connected successfully for question deletion.');
    } catch (err) {
      console.error('Failed to connect to MongoDB for question deletion:', err);
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

    const { questionId } = await req.json();

    if (!questionId || !ObjectId.isValid(questionId)) {
      return NextResponse.json({ success: false, message: 'Valid question ID is required.' }, { status: 400 });
    }
    
    const db = await connectToDatabase();
    const questionsCollection = db.collection('questions');
    const questionObjectId = new ObjectId(questionId);

    // Find the question to check authorship
    const questionToDelete = await questionsCollection.findOne({ _id: questionObjectId });

    if (!questionToDelete) {
        return NextResponse.json({ success: false, message: 'Question not found.' }, { status: 404 });
    }

    // Check authorization: Logged-in user must be the author of the question
    if (!questionToDelete.authorId.equals(loggedInUserObjectId)) {
        return NextResponse.json({ success: false, message: 'Forbidden. You are not authorized to delete this question.' }, { status: 403 });
    }

    // Delete the question
    const result = await questionsCollection.deleteOne({ _id: questionObjectId });

    if (result.deletedCount > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Question deleted successfully!'
      }, { status: 200 });
    } else {
      console.error('Question deletion failed. Question not found or not deleted.');
      return NextResponse.json({ success: false, message: 'Failed to delete question. It might have already been removed.' }, { status: 500 });
    }

  } catch (error) {
    console.error('Question deletion API error:', error);
    let errorMessage = 'An internal server error occurred during question deletion.';
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
