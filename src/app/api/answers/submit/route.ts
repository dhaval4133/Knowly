
'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import type { AnswerData } from '@/lib/types';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable for answer submission');
}
if (!MONGODB_DB_NAME) {
 throw new Error('Please define the MONGODB_DB_NAME environment variable for answer submission');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    try {
      await cachedClient.db(MONGODB_DB_NAME).command({ ping: 1 });
      return cachedDb;
    } catch (e) {
      console.warn('Cached MongoDB connection lost for answer submission, attempting to reconnect...', e);
      cachedClient = null;
      cachedDb = null;
    }
  }

  if (!cachedClient) {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined at connectToDatabase call for answer submission.');
    }
    cachedClient = new MongoClient(MONGODB_URI);
    try {
      await cachedClient.connect();
      console.log('MongoDB connected successfully for answer submission.');
    } catch (err) {
      console.error('Failed to connect to MongoDB for answer submission:', err);
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
      return NextResponse.json({ success: false, message: 'Unauthorized. Please log in to post an answer.' }, { status: 401 });
    }

    const loggedInUserIdString = sessionIdCookie.value;
    if (!ObjectId.isValid(loggedInUserIdString)) {
        return NextResponse.json({ success: false, message: 'Invalid user session.' }, { status: 401 });
    }
    const loggedInUserObjectId = new ObjectId(loggedInUserIdString);

    const { questionId, content } = await req.json();

    if (!questionId || !ObjectId.isValid(questionId)) {
      return NextResponse.json({ success: false, message: 'Valid question ID is required.' }, { status: 400 });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ success: false, message: 'Answer content cannot be empty.' }, { status: 400 });
    }
    
    const db = await connectToDatabase();
    const questionsCollection = db.collection('questions');
    const usersCollection = db.collection('users');

    // Verify logged-in user exists
    const authorExists = await usersCollection.findOne({ _id: loggedInUserObjectId });
    if (!authorExists) {
        return NextResponse.json({ success: false, message: 'Author not found.' }, { status: 404 });
    }

    // Verify question exists and get its authorId
    const questionObjectId = new ObjectId(questionId);
    const questionExists = await questionsCollection.findOne({ _id: questionObjectId });
    if (!questionExists) {
        return NextResponse.json({ success: false, message: 'Question not found.' }, { status: 404 });
    }

    // Prevent user from answering their own question
    if (questionExists.authorId.toString() === loggedInUserIdString) {
      return NextResponse.json({ success: false, message: 'You cannot answer your own question.' }, { status: 403 });
    }

    const newAnswer: AnswerData = {
      _id: new ObjectId().toString(), 
      content,
      authorId: loggedInUserIdString, 
      createdAt: new Date(), 
      upvotes: 0,
      downvotes: 0,
    };

    const result = await questionsCollection.updateOne(
      { _id: questionObjectId },
      {
        $push: { answers: newAnswer },
        $set: { updatedAt: new Date() } 
      }
    );

    if (result.modifiedCount > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Answer posted successfully!', 
        answer: newAnswer 
      }, { status: 201 });
    } else {
      console.error('Answer submission failed. Question not updated.');
      return NextResponse.json({ success: false, message: 'Failed to post answer. Could not update question.' }, { status: 500 });
    }

  } catch (error) {
    console.error('Answer submission API error:', error);
    let errorMessage = 'An internal server error occurred during answer submission.';
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
