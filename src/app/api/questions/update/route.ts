
'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { cookies } from 'next/headers';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable for question update');
}
if (!MONGODB_DB_NAME) {
 throw new Error('Please define the MONGODB_DB_NAME environment variable for question update');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    try {
      await cachedClient.db(MONGODB_DB_NAME).command({ ping: 1 });
      return cachedDb;
    } catch (e) {
      console.warn('Cached MongoDB connection lost for question update, attempting to reconnect...', e);
      cachedClient = null;
      cachedDb = null;
    }
  }

  if (!cachedClient) {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined at connectToDatabase call for question update.');
    }
    cachedClient = new MongoClient(MONGODB_URI);
    try {
      await cachedClient.connect();
      console.log('MongoDB connected successfully for question update.');
    } catch (err) {
      console.error('Failed to connect to MongoDB for question update:', err);
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
      return NextResponse.json({ success: false, message: 'Unauthorized. Please log in to update a question.' }, { status: 401 });
    }

    const loggedInUserIdString = sessionIdCookie.value;
    if (!ObjectId.isValid(loggedInUserIdString)) {
        return NextResponse.json({ success: false, message: 'Invalid user session.' }, { status: 401 });
    }
    const loggedInUserObjectId = new ObjectId(loggedInUserIdString);

    const { questionId, title, description, tags } = await req.json();

    if (!questionId || !ObjectId.isValid(questionId)) {
      return NextResponse.json({ success: false, message: 'Valid question ID is required.' }, { status: 400 });
    }
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ success: false, message: 'Title cannot be empty.' }, { status: 400 });
    }
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json({ success: false, message: 'Description cannot be empty.' }, { status: 400 });
    }
    if (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string' || tag.trim().length === 0)) {
      return NextResponse.json({ success: false, message: 'Tags must be an array of non-empty strings.' }, { status: 400 });
    }
     if (tags.length === 0) {
      return NextResponse.json({ success: false, message: 'At least one tag is required.' }, { status: 400 });
    }
    
    const db = await connectToDatabase();
    const questionsCollection = db.collection('questions');
    const questionObjectId = new ObjectId(questionId);

    const questionToUpdate = await questionsCollection.findOne({ _id: questionObjectId });

    if (!questionToUpdate) {
        return NextResponse.json({ success: false, message: 'Question not found.' }, { status: 404 });
    }

    if (!questionToUpdate.authorId.equals(loggedInUserObjectId)) {
        return NextResponse.json({ success: false, message: 'Forbidden. You are not authorized to update this question.' }, { status: 403 });
    }

    const result = await questionsCollection.updateOne(
      { _id: questionObjectId },
      { 
        $set: { 
          title, 
          description, 
          tags,
          updatedAt: new Date() // Update the updatedAt timestamp
        }
      }
    );

    if (result.modifiedCount > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Question updated successfully!',
        questionId: questionId
      }, { status: 200 });
    } else if (result.matchedCount > 0 && result.modifiedCount === 0) {
      // This means the document was found, but no fields were actually different.
      return NextResponse.json({
        success: true,
        message: 'No changes detected in the question.',
        questionId: questionId
       }, { status: 200 });
    }
    else {
      console.error('Question update failed. Question not found or not updated.');
      return NextResponse.json({ success: false, message: 'Failed to update question.' }, { status: 500 });
    }

  } catch (error) {
    console.error('Question update API error:', error);
    let errorMessage = 'An internal server error occurred during question update.';
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
