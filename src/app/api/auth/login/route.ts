
// Use server directive for Next.js App Router API routes
'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

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
    try {
      // Ping the database to ensure the connection is still alive
      await cachedClient.db(MONGODB_DB_NAME).command({ ping: 1 });
      // console.log('Using cached database instance for login.');
      return cachedDb;
    } catch (e) {
      console.warn('Cached MongoDB connection lost, attempting to reconnect...', e);
      cachedClient = null;
      cachedDb = null;
    }
  }

  if (!cachedClient) {
    console.log('No cached client or connection lost for login, creating new MongoClient instance.');
    if (!MONGODB_URI) {
      console.error('CRITICAL: MONGODB_URI is not defined at connectToDatabase call for login.');
      throw new Error('MONGODB_URI is not defined. This should have been caught by top-level check.');
    }
    cachedClient = new MongoClient(MONGODB_URI);
    try {
      console.log('Attempting to connect to MongoDB for login...');
      await cachedClient.connect();
      console.log('MongoDB connected successfully for login.');
    } catch (err) {
      console.error('Failed to connect to MongoDB for login:', err);
      cachedClient = null; // Reset client on connection failure
      throw err;
    }
  }

  if (!MONGODB_DB_NAME) {
    console.error('CRITICAL: MONGODB_DB_NAME is not defined at connectToDatabase call for login.');
    throw new Error('MONGODB_DB_NAME is not defined. This should have been caught by top-level check.');
  }
  console.log(`Getting database for login: ${MONGODB_DB_NAME}`);
  cachedDb = cachedClient.db(MONGODB_DB_NAME);
  return cachedDb;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    console.log('Login attempt for email:', email);

    if (!email || !password) {
      console.log('Login validation failed: Email or password missing for', email);
      return NextResponse.json({ success: false, message: 'Email and password are required.' }, { status: 400 });
    }
    console.log('Login input validation passed for email:', email);
    
    const db = await connectToDatabase();
    console.log('Database connection supposedly successful for login of:', email);
    const usersCollection = db.collection('users');

    console.log('Searching for user:', email);
    const user = await usersCollection.findOne({ email });

    if (!user) {
      console.log('Login failed: User not found for email:', email);
      return NextResponse.json({ success: false, message: 'Invalid credentials.' }, { status: 401 });
    }
    console.log('User found for email:', email, '. Verifying password.');

    const isPasswordValid = await bcrypt.compare(password, user.password as string); 

    if (!isPasswordValid) {
      console.log('Login failed: Invalid password for email:', email);
      return NextResponse.json({ success: false, message: 'Invalid credentials.' }, { status: 401 });
    }
    
    const userId = user._id.toString();
    const userName = user.name as string;
    console.log('Login successful for email:', email, 'User ID:', userId);

    // Set HttpOnly cookie for session management
    cookies().set('knowly-session-id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      sameSite: 'lax', // or 'strict'
    });
    
    return NextResponse.json({ 
        success: true, 
        message: 'Login successful', 
        userId: userId, 
        userName: userName
    }, { status: 200 });

  } catch (error) {
    console.error('Login API error:', error);
    let errorMessage = 'An internal server error occurred during login.';
    let errorStatus = 500;

    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Failed to connect to the database. Please check your connection string and ensure the database server is running.';
        errorStatus = 503; // Service Unavailable
      } else if (error.message.includes('querySrv ESERVFAIL') || error.message.includes('queryTxt ESERVFAIL')) {
        errorMessage = 'Database connection failed: DNS resolution error. Check your MongoDB URI and network settings.';
        errorStatus = 503;
      } else if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
        errorMessage = 'Database connection failed: Authentication error. Check your MongoDB credentials.';
        errorStatus = 503;
      }
    }
    return NextResponse.json({ success: false, message: errorMessage }, { status: errorStatus });
  }
}
