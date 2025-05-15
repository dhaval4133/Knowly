
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
    // Optional: Check if client is still connected, though driver usually handles this.
    // For this iteration, we assume if cachedDb exists, connection was good.
    // console.log('Using cached database instance.');
    return cachedDb;
  }

  if (!cachedClient) {
    console.log('No cached client, creating new MongoClient instance.');
    if (!MONGODB_URI) {
      console.error('CRITICAL: MONGODB_URI is not defined at connectToDatabase call.');
      throw new Error('MONGODB_URI is not defined. This should have been caught by top-level check.');
    }
    cachedClient = new MongoClient(MONGODB_URI);
    try {
      console.log('Attempting to connect to MongoDB...');
      await cachedClient.connect();
      console.log('MongoDB connected successfully.');
    } catch (err) {
      console.error('Failed to connect to MongoDB:', err);
      cachedClient = null; // Reset client on connection failure so next attempt tries fresh
      throw err; // Re-throw the error to be caught by the POST handler
    }
  }

  if (!MONGODB_DB_NAME) {
    console.error('CRITICAL: MONGODB_DB_NAME is not defined at connectToDatabase call.');
    throw new Error('MONGODB_DB_NAME is not defined. This should have been caught by top-level check.');
  }
  
  console.log(`Getting database: ${MONGODB_DB_NAME}`);
  cachedDb = cachedClient.db(MONGODB_DB_NAME);
  return cachedDb;
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();
    console.log('Registration attempt received for email:', email);

    if (!name || !email || !password) {
      console.log('Validation failed: Name, email, or password missing.');
      return NextResponse.json({ success: false, message: 'Name, email, and password are required.' }, { status: 400 });
    }

    if (password.length < 6) {
      console.log('Validation failed: Password too short for email:', email);
      return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }
    console.log('Input validation passed for email:', email);
    
    const db = await connectToDatabase();
    console.log('Database connection supposedly successful for registration of:', email);
    const usersCollection = db.collection('users');

    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', email);
      return NextResponse.json({ success: false, message: 'User with this email already exists.' }, { status: 409 }); // 409 Conflict
    }
    console.log('User does not exist, proceeding with registration for:', email);

    console.log('Hashing password for:', email);
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed for:', email);

    const newUser = {
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
    };

    console.log('Inserting new user for email:', newUser.email);
    const result = await usersCollection.insertOne(newUser);
    console.log('MongoDB insert result for', newUser.email, ':', result);


    if (result.insertedId) {
      console.log('User registration successful for:', email, 'ID:', result.insertedId.toString());
      return NextResponse.json({ success: true, message: 'Account created successfully!', userId: result.insertedId.toString() }, { status: 201 });
    } else {
      console.error('User registration failed after insert for:', email, '. No insertedId in result.');
      return NextResponse.json({ success: false, message: 'Failed to create user account.' }, { status: 500 });
    }

  } catch (error) {
    console.error('Registration API error:', error); // This will log the actual error object
    let errorMessage = 'An internal server error occurred during registration.';
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
      // Add more specific MongoDB error checks if needed
    }
    
    return NextResponse.json({ success: false, message: errorMessage }, { status: errorStatus });
  }
}
