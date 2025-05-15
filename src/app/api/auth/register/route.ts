
// Use server directive for Next.js App Router API routes
'use server';

import { type NextRequest, NextResponse } from 'next/server';

// You would need to install and import a MongoDB client and a password hashing library
// e.g., import { MongoClient } from 'mongodb';
// e.g., import bcrypt from 'bcryptjs'; // or any other hashing library

// const MONGODB_URI = process.env.MONGODB_URI; // Set this in your .env file
// const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME; // Set this in your .env file

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

    // --- Mock logic (replace with actual DB logic above) ---
    console.log('Mock registration for:', { name, email, password });
    // In a real scenario, check if user exists, hash password, then insert.
    // For this mock, we'll assume success unless it's a known "failing" email.
    if (email === 'fail@example.com') {
        return NextResponse.json({ success: false, message: 'This email is blocked (mock).' }, { status: 400 });
    }
    // --- End Mock logic ---

    // If registration is successful:
    return NextResponse.json({ success: true, message: 'Account created successfully! (mock)' /* , userId: result.insertedId */ }, { status: 201 });

  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json({ success: false, message: 'An internal server error occurred.' }, { status: 500 });
  }
}
