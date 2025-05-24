
'use server';

import { MongoClient, Db, ObjectId, WithId, Filter } from 'mongodb';
import type { AnswerData, QuestionData, PopulatedQuestion, User as UserType } from '@/lib/types';

// Define a more specific type for Question documents from MongoDB
interface QuestionDBDocument extends QuestionData { // Inherits fields from QuestionData
  _id: ObjectId;
  authorId: ObjectId;
  answers: AnswerDBDocument[]; 
}

interface AnswerDBDocument extends AnswerData { // Inherits fields from AnswerData
    _id: ObjectId | string; 
    authorId: ObjectId | string;
}

interface UserDBDocument extends WithId<Document> {
  _id: ObjectId;
  name: string;
  avatarUrl?: string;
}

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;
const QUESTIONS_PER_PAGE = 10; 

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    try {
      await cachedClient.db(MONGODB_DB_NAME).command({ ping: 1 });
      return cachedDb;
    } catch (e) {
      console.warn('Cached MongoDB connection lost for questionActions, attempting to reconnect...', e);
      cachedClient = null;
      cachedDb = null;
    }
  }
  if (!MONGODB_URI || !MONGODB_DB_NAME) {
    // This case should be handled by the caller, but as a safeguard:
    console.error('MongoDB URI or DB Name not configured for questionActions.');
    return null; 
  }
  if (!cachedClient) {
    cachedClient = new MongoClient(MONGODB_URI);
    try {
      await cachedClient.connect();
    } catch (err) {
      console.error('Failed to connect to MongoDB for questionActions:', err);
      cachedClient = null;
      return null; // Indicate connection failure
    }
  }
  cachedDb = cachedClient.db(MONGODB_DB_NAME);
  return cachedDb;
}

export interface FetchQuestionsResult {
  questions: PopulatedQuestion[];
  totalPages: number;
  dbConfigured: boolean;
  error?: string;
}

export async function fetchPaginatedQuestions(page: number, searchTerm?: string): Promise<FetchQuestionsResult> {
  if (!MONGODB_URI || !MONGODB_DB_NAME) {
    return { questions: [], totalPages: 0, dbConfigured: false };
  }

  try {
    const db = await connectToDatabase();
    if (!db) {
      return { questions: [], totalPages: 0, dbConfigured: true, error: "Database connection failed." };
    }
    const questionsCollection = db.collection<QuestionDBDocument>('questions');
    const usersCollection = db.collection<UserDBDocument>('users');

    const query: Filter<QuestionDBDocument> = {};
    if (searchTerm && searchTerm.trim() !== '') {
      const regex = { $regex: searchTerm, $options: 'i' };
      query.$or = [
        { title: regex },
        { description: regex },
        { tags: regex }
      ];
    }

    const totalQuestions = await questionsCollection.countDocuments(query);
    const totalPages = Math.ceil(totalQuestions / QUESTIONS_PER_PAGE);
    const skipAmount = (page - 1) * QUESTIONS_PER_PAGE;

    const questionDocs = await questionsCollection.find(query)
      .sort({ updatedAt: -1 })
      .skip(skipAmount)
      .limit(QUESTIONS_PER_PAGE)
      .toArray();
    
    const questionAuthorIds = new Set<ObjectId>();
    questionDocs.forEach(qDoc => {
      questionAuthorIds.add(qDoc.authorId);
    });
    
    const uniqueQuestionAuthorIdsArray = Array.from(questionAuthorIds);

    const authorsArray = await usersCollection.find({ _id: { $in: uniqueQuestionAuthorIdsArray } }).toArray();
    const authorsMap = new Map<string, UserType>();
    authorsArray.forEach(authorDoc => {
      authorsMap.set(authorDoc._id.toString(), {
        id: authorDoc._id.toString(),
        name: authorDoc.name,
        avatarUrl: authorDoc.avatarUrl || `https://placehold.co/100x100.png?text=${authorDoc.name[0]?.toUpperCase() || 'U'}`,
      });
    });
    
    const defaultAuthor: UserType = { id: 'unknown', name: 'Unknown User', avatarUrl: 'https://placehold.co/100x100.png?text=U' };

    const populatedQuestions: PopulatedQuestion[] = questionDocs.map(qDoc => {
      const questionAuthor = authorsMap.get(qDoc.authorId.toString()) || defaultAuthor;
      
      const populatedAnswers = (qDoc.answers || []).map(ans => {
        const ansId = typeof ans._id === 'string' ? ans._id : ans._id.toString();
        return {
          id: ansId,
          content: ans.content,
          author: defaultAuthor, 
          createdAt: ans.createdAt && (ans.createdAt instanceof Date || !isNaN(new Date(ans.createdAt).getTime())) 
                       ? new Date(ans.createdAt).toISOString() 
                       : new Date(0).toISOString(),
          upvotes: ans.upvotes,
          downvotes: ans.downvotes,
        };
      });

      const validCreatedAt = qDoc.createdAt && (qDoc.createdAt instanceof Date || !isNaN(new Date(qDoc.createdAt).getTime())) 
                             ? new Date(qDoc.createdAt).toISOString() 
                             : new Date(0).toISOString();
      const validUpdatedAt = qDoc.updatedAt && (qDoc.updatedAt instanceof Date || !isNaN(new Date(qDoc.updatedAt).getTime())) 
                             ? new Date(qDoc.updatedAt).toISOString() 
                             : validCreatedAt;

      return {
        id: qDoc._id.toString(),
        title: qDoc.title,
        description: qDoc.description,
        tags: qDoc.tags.map(tag => ({ id: tag, name: tag })), 
        author: questionAuthor,
        createdAt: validCreatedAt,
        updatedAt: validUpdatedAt,
        upvotes: qDoc.upvotes,
        downvotes: qDoc.downvotes,
        views: qDoc.views,
        answers: populatedAnswers,
      };
    });

    return { questions: populatedQuestions, totalPages, dbConfigured: true };
  } catch (error) {
    console.error('Error in fetchPaginatedQuestions:', error);
    return { questions: [], totalPages: 0, dbConfigured: true, error: error instanceof Error ? error.message : "An unknown error occurred" }; 
  }
}
