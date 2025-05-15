
// Use server directive for Next.js App Router API routes
'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db } from 'mongodb';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env or .env.local');
}
if (!MONGODB_DB_NAME) {
 throw new Error('Please define the MONGODB_DB_NAME environment variable inside .env or .env.local');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return cachedDb;
  }
  if(!cachedClient) {
    cachedClient = new MongoClient(MONGODB_URI!);
    await cachedClient.connect();
  }
  cachedDb = cachedClient.db(MONGODB_DB_NAME);
  return cachedDb;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email and password are required.' }, { status: 400 });
    }
    
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email });

    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid credentials.' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password as string); 

    if (!isPasswordValid) {
      return NextResponse.json({ success: false, message: 'Invalid credentials.' }, { status: 401 });
    }
    
    // TODO: Implement session creation (e.g., JWT, next-auth)
    // For now, just return basic user info (excluding password)
    return NextResponse.json({ 
        success: true, 
        message: 'Login successful', 
        userId: user._id.toString(), 
        userName: user.name 
    }, { status: 200 });

  } catch (error) {
    console.error('Login API error:', error);
    // Check if it's a MongoDB connection error
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
        return NextResponse.json({ success: false, message: 'Failed to connect to the database. Please check your connection string and ensure the database server is running.' }, { status: 503 }); // 503 Service Unavailable
    }
    return NextResponse.json({ success: false, message: 'An internal server error occurred.' }, { status: 500 });
  }
}
