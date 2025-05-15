
'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { cookies } from 'next/headers';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable for question submission');
}
if (!MONGODB_DB_NAME) {
 throw new Error('Please define the MONGODB_DB_NAME environment variable for question submission');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    try {
      await cachedClient.db(MONGODB_DB_NAME).command({ ping: 1 });
      return cachedDb;
    } catch (e) {
      console.warn('Cached MongoDB connection lost for question submission, attempting to reconnect...', e);
      cachedClient = null;
      cachedDb = null;
    }
  }

  if (!cachedClient) {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined at connectToDatabase call.');
    }
    cachedClient = new MongoClient(MONGODB_URI);
    try {
      await cachedClient.connect();
      console.log('MongoDB connected successfully for question submission.');
    } catch (err) {
      console.error('Failed to connect to MongoDB for question submission:', err);
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
      return NextResponse.json({ success: false, message: 'Unauthorized. Please log in to ask a question.' }, { status: 401 });
    }

    const authorId = sessionIdCookie.value;
    if (!ObjectId.isValid(authorId)) {
        return NextResponse.json({ success: false, message: 'Invalid user session.' }, { status: 401 });
    }

    const { title, description, tags } = await req.json();

    if (!title || !description || !tags || tags.length === 0) {
      return NextResponse.json({ success: false, message: 'Title, description, and at least one tag are required.' }, { status: 400 });
    }
    
    if (tags.some((tag: any) => typeof tag !== 'string')) {
      return NextResponse.json({ success: false, message: 'All tags must be strings.' }, { status: 400 });
    }


    const db = await connectToDatabase();
    const questionsCollection = db.collection('questions');
    const usersCollection = db.collection('users');

    // Verify authorId exists
    const authorExists = await usersCollection.findOne({ _id: new ObjectId(authorId) });
    if (!authorExists) {
        return NextResponse.json({ success: false, message: 'Author not found.' }, { status: 404 });
    }

    const newQuestion = {
      title,
      description,
      tags, // Storing tags as an array of strings
      authorId: new ObjectId(authorId),
      createdAt: new Date(),
      upvotes: 0,
      downvotes: 0,
      answers: [], // Initialize with empty answers
    };

    const result = await questionsCollection.insertOne(newQuestion);

    if (result.insertedId) {
      return NextResponse.json({ 
        success: true, 
        message: 'Question posted successfully!', 
        questionId: result.insertedId.toString() 
      }, { status: 201 });
    } else {
      console.error('Question submission failed after insert. No insertedId in result.');
      return NextResponse.json({ success: false, message: 'Failed to post question.' }, { status: 500 });
    }

  } catch (error) {
    console.error('Question submission API error:', error);
    let errorMessage = 'An internal server error occurred during question submission.';
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
