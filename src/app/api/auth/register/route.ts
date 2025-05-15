
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
  if (!cachedClient) {
    cachedClient = new MongoClient(MONGODB_URI!);
    await cachedClient.connect();
  }
  cachedDb = cachedClient.db(MONGODB_DB_NAME);
  return cachedDb;
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, message: 'Name, email, and password are required.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }
    
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');

    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ success: false, message: 'User with this email already exists.' }, { status: 409 }); // 409 Conflict
    }

    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password

    const newUser = {
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    if (result.insertedId) {
      return NextResponse.json({ success: true, message: 'Account created successfully!', userId: result.insertedId.toString() }, { status: 201 });
    } else {
      return NextResponse.json({ success: false, message: 'Failed to create user account.' }, { status: 500 });
    }

  } catch (error) {
    console.error('Registration API error:', error);
    // Check if it's a MongoDB connection error
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
        return NextResponse.json({ success: false, message: 'Failed to connect to the database. Please check your connection string and ensure the database server is running.' }, { status: 503 }); // 503 Service Unavailable
    }
    return NextResponse.json({ success: false, message: 'An internal server error occurred.' }, { status: 500 });
  }
}
