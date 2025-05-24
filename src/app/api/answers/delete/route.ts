
'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { cookies } from 'next/headers';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable for answer deletion');
}
if (!MONGODB_DB_NAME) {
 throw new Error('Please define the MONGODB_DB_NAME environment variable for answer deletion');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    try {
      await cachedClient.db(MONGODB_DB_NAME).command({ ping: 1 });
      return cachedDb;
    } catch (e) {
      console.warn('Cached MongoDB connection lost for answer deletion, attempting to reconnect...', e);
      cachedClient = null;
      cachedDb = null;
    }
  }

  if (!cachedClient) {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined at connectToDatabase call for answer deletion.');
    }
    cachedClient = new MongoClient(MONGODB_URI);
    try {
      await cachedClient.connect();
      console.log('MongoDB connected successfully for answer deletion.');
    } catch (err) {
      console.error('Failed to connect to MongoDB for answer deletion:', err);
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

    const { questionId, answerId } = await req.json();

    if (!questionId || !ObjectId.isValid(questionId)) {
      return NextResponse.json({ success: false, message: 'Valid question ID is required.' }, { status: 400 });
    }
    if (!answerId || typeof answerId !== 'string') { // Answer IDs are stored as strings
      return NextResponse.json({ success: false, message: 'Valid answer ID is required.' }, { status: 400 });
    }
    
    const db = await connectToDatabase();
    const questionsCollection = db.collection('questions');
    const questionObjectId = new ObjectId(questionId);

    // Find the question and the specific answer
    const question = await questionsCollection.findOne({ _id: questionObjectId });

    if (!question) {
        return NextResponse.json({ success: false, message: 'Question not found.' }, { status: 404 });
    }

    const answerToDelete = question.answers.find((ans: any) => ans._id.toString() === answerId);

    if (!answerToDelete) {
        return NextResponse.json({ success: false, message: 'Answer not found within the question.' }, { status: 404 });
    }

    // Check authorization: Logged-in user must be the author of the answer
    if (answerToDelete.authorId.toString() !== loggedInUserIdString) {
        return NextResponse.json({ success: false, message: 'Forbidden. You are not authorized to delete this answer.' }, { status: 403 });
    }

    // Remove the answer using $pull
    // Since answer._id is stored as a string, we match it directly.
    const result = await questionsCollection.updateOne(
      { _id: questionObjectId },
      { 
        $pull: { answers: { _id: answerId } },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.modifiedCount > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Answer deleted successfully!'
      }, { status: 200 });
    } else {
      console.error('Answer deletion failed. Question not updated or answer not found by $pull.');
      // This could happen if the answerId didn't match, or if the question was modified concurrently.
      return NextResponse.json({ success: false, message: 'Failed to delete answer. Could not update question or answer not found.' }, { status: 500 });
    }

  } catch (error) {
    console.error('Answer deletion API error:', error);
    let errorMessage = 'An internal server error occurred during answer deletion.';
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
