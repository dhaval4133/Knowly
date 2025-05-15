
// Use server directive for Next.js App Router API routes
'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { addMockUser } from '@/lib/mock-auth-store';

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
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, message: 'Name, email, and password are required.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }
    
    // --- START: MongoDB Integration Placeholder ---
    // const db = await connectToDatabase();
    // const usersCollection = db.collection('users');

    // const existingUser = await usersCollection.findOne({ email });
    // if (existingUser) {
    //   return NextResponse.json({ success: false, message: 'User with this email already exists.' }, { status: 409 }); // 409 Conflict
    // }

    // const hashedPassword = await bcrypt.hash(password, 10); // Hash the password

    // const newUser = {
    //   name,
    //   email,
    //   password: hashedPassword,
    //   createdAt: new Date(),
    // };

    // const result = await usersCollection.insertOne(newUser);
    // --- END: MongoDB Integration Placeholder ---

    // --- Mock logic using in-memory store ---
    const registrationResult = addMockUser({ name, email, passwordRaw: password });
    if (registrationResult.success) {
      return NextResponse.json({ success: true, message: registrationResult.message, userId: registrationResult.userId }, { status: 201 });
    } else {
      return NextResponse.json({ success: false, message: registrationResult.message }, { status: 409 }); // 409 Conflict if user exists
    }
    // --- End Mock logic ---

  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json({ success: false, message: 'An internal server error occurred.' }, { status: 500 });
  }
}
