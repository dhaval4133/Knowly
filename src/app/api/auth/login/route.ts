
// Use server directive for Next.js App Router API routes
'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { findMockUser } from '@/lib/mock-auth-store';

// MongoDB related comments are kept for future reference if you integrate a real DB
// import { MongoClient } from 'mongodb';
// import bcrypt from 'bcryptjs';

// const MONGODB_URI = process.env.MONGODB_URI;
// const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

// if (!MONGODB_URI) {
//   throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
// }
// if (!MONGODB_DB_NAME) {
//  throw new Error('Please define the MONGODB_DB_NAME environment variable inside .env.local');
// }

// let cachedClient: MongoClient | null = null;
// async function connectToDatabase() {
//   if (cachedClient) {
//     return cachedClient.db(MONGODB_DB_NAME);
//   }
//   const client = new MongoClient(MONGODB_URI!);
//   await client.connect();
//   cachedClient = client;
//   return client.db(MONGODB_DB_NAME);
// }

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email and password are required.' }, { status: 400 });
    }

    // --- START: MongoDB Integration Placeholder ---
    // const db = await connectToDatabase();
    // const usersCollection = db.collection('users');

    // const user = await usersCollection.findOne({ email });

    // if (!user) {
    //   return NextResponse.json({ success: false, message: 'Invalid credentials.' }, { status: 401 });
    // }

    // const isPasswordValid = await bcrypt.compare(password, user.password); // user.password should be the hashed password

    // if (!isPasswordValid) {
    //   return NextResponse.json({ success: false, message: 'Invalid credentials.' }, { status: 401 });
    // }
    // --- END: MongoDB Integration Placeholder ---
    
    // --- Mock logic using in-memory store ---
    const user = findMockUser(email, password);

    if (user) {
      // TODO: Implement session creation (e.g., JWT, next-auth)
      return NextResponse.json({ success: true, message: 'Login successful (mock)', userId: user.id, userName: user.name }, { status: 200 });
    } else {
      return NextResponse.json({ success: false, message: 'Invalid credentials (mock).' }, { status: 401 });
    }
    // --- End Mock logic ---

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ success: false, message: 'An internal server error occurred.' }, { status: 500 });
  }
}
