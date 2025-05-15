
// This is now a Server Component
import type { User as UserType, Question as PopulatedQuestion, Answer as PopulatedAnswer } from '@/lib/types';
import { notFound } from 'next/navigation';
import { MongoClient, Db, ObjectId, WithId } from 'mongodb';
import type { AnswerData, QuestionData } from '@/lib/types';
import { AlertTriangle } from 'lucide-react';
import ProfileClientLayout from '@/components/profile/profile-client-layout';

interface ProfilePageProps {
  params: { userId: string };
}

// Define DB document types (can be moved to a shared types file if used elsewhere)
interface UserDBDocument extends WithId<Document> {
  _id: ObjectId;
  name: string;
  email?: string;
  createdAt: Date;
  avatarUrl?: string;
}

interface QuestionDBDocument extends QuestionData {
  _id: ObjectId;
  authorId: ObjectId;
  answers: AnswerDBDocument[];
}

interface AnswerDBDocument extends AnswerData {
  _id: ObjectId | string;
  authorId: ObjectId | string;
}

export interface UserAnswerEntry {
  answer: PopulatedAnswer;
  question: {
    id: string;
    title: string;
  };
}

export interface ProfileData {
  fetchedUser: UserDBDocument | null;
  userQuestions: PopulatedQuestion[];
  userAnswers: UserAnswerEntry[];
  dbConfigured: boolean;
  profileUserId: string;
}

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    try {
      await cachedClient.db(MONGODB_DB_NAME).command({ ping: 1 });
      return cachedDb;
    } catch (e) {
      console.warn('Cached MongoDB connection lost for profile page, attempting to reconnect...', e);
      cachedClient = null;
      cachedDb = null;
    }
  }
  if (!MONGODB_URI || !MONGODB_DB_NAME) {
    throw new Error('MongoDB URI or DB Name not configured for profile page.');
  }
  if (!cachedClient) {
    cachedClient = new MongoClient(MONGODB_URI);
    try {
      await cachedClient.connect();
    } catch (err) {
      cachedClient = null;
      throw err;
    }
  }
  cachedDb = cachedClient.db(MONGODB_DB_NAME);
  return cachedDb;
}

async function getUserById(userId: string, db: Db): Promise<UserDBDocument | null> {
  if (!ObjectId.isValid(userId)) return null;
  try {
    return await db.collection<UserDBDocument>('users').findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });
  } catch (error) {
    console.error('Error fetching user from DB for profile page:', error);
    return null;
  }
}

async function getQuestionsByAuthorId(authorIdString: string, db: Db, usersCollection: any): Promise<PopulatedQuestion[]> {
    if (!ObjectId.isValid(authorIdString)) return [];
    const defaultAuthor: UserType = { id: 'unknown', name: 'Unknown User', avatarUrl: 'https://placehold.co/100x100.png?text=U' };
    try {
        const questionsCollection = db.collection<QuestionDBDocument>('questions');
        const authorObjectId = new ObjectId(authorIdString);
        const questionDocs = await questionsCollection.find({ authorId: authorObjectId }).sort({ updatedAt: -1 }).toArray();
        
        const profileAuthorDoc = await usersCollection.findOne({ _id: authorObjectId });
        if (!profileAuthorDoc) return [];

        const profileAuthor: UserType = {
            id: profileAuthorDoc._id.toString(),
            name: profileAuthorDoc.name,
            avatarUrl: profileAuthorDoc.avatarUrl || `https://placehold.co/100x100.png?text=${profileAuthorDoc.name[0]?.toUpperCase() || 'U'}`,
        };

        return questionDocs.map(qDoc => {
            const populatedAnswers = (qDoc.answers || []).map(ans => {
                const ansId = typeof ans._id === 'string' ? ans._id : ans._id.toString();
                return {
                    id: ansId,
                    content: ans.content,
                    author: defaultAuthor, // Using defaultAuthor as QuestionCard doesn't display this for lists
                    createdAt: ans.createdAt && (ans.createdAt instanceof Date || !isNaN(new Date(ans.createdAt).getTime())) ? new Date(ans.createdAt).toISOString() : new Date(0).toISOString(),
                    upvotes: ans.upvotes,
                    downvotes: ans.downvotes,
                };
            });
            const validCreatedAt = qDoc.createdAt && (qDoc.createdAt instanceof Date || !isNaN(new Date(qDoc.createdAt).getTime())) ? new Date(qDoc.createdAt).toISOString() : new Date(0).toISOString();
            const validUpdatedAt = qDoc.updatedAt && (qDoc.updatedAt instanceof Date || !isNaN(new Date(qDoc.updatedAt).getTime())) ? new Date(qDoc.updatedAt).toISOString() : validCreatedAt;
            
            return {
                id: qDoc._id.toString(), title: qDoc.title, description: qDoc.description,
                tags: qDoc.tags.map(tag => ({ id: tag, name: tag })), author: profileAuthor,
                createdAt: validCreatedAt, updatedAt: validUpdatedAt,
                upvotes: qDoc.upvotes, downvotes: qDoc.downvotes, views: qDoc.views, answers: populatedAnswers,
            };
        });
    } catch (error) {
        console.error('Error fetching questions by author ID for profile:', error);
        return [];
    }
}

async function getAnswersByAuthorId(profileUserIdString: string, db: Db, usersCollection: any): Promise<UserAnswerEntry[]> {
    if (!ObjectId.isValid(profileUserIdString)) return [];
    try {
        const questionsCollection = db.collection<QuestionDBDocument>('questions');
        const profileUserObjectId = new ObjectId(profileUserIdString);
        const profileUserDoc = await usersCollection.findOne({ _id: profileUserObjectId });
        if (!profileUserDoc) return [];

        const profileUserType: UserType = {
            id: profileUserDoc._id.toString(), name: profileUserDoc.name,
            avatarUrl: profileUserDoc.avatarUrl || `https://placehold.co/100x100.png?text=${profileUserDoc.name[0]?.toUpperCase() || 'U'}`,
        };
        
        const questionDocs = await questionsCollection.find({ "answers.authorId": profileUserIdString }).sort({"answers.createdAt": -1}).toArray();
        const userAnswerEntries: UserAnswerEntry[] = [];

        for (const qDoc of questionDocs) {
            for (const ans of (qDoc.answers || [])) {
                const answerAuthorIdStr = ans.authorId.toString();
                if (answerAuthorIdStr === profileUserIdString) {
                    userAnswerEntries.push({
                        answer: {
                            id: typeof ans._id === 'string' ? ans._id : ans._id.toString(), content: ans.content, author: profileUserType,
                            createdAt: ans.createdAt && (ans.createdAt instanceof Date || !isNaN(new Date(ans.createdAt).getTime())) ? new Date(ans.createdAt).toISOString() : new Date(0).toISOString(),
                            upvotes: ans.upvotes, downvotes: ans.downvotes,
                        },
                        question: { id: qDoc._id.toString(), title: qDoc.title },
                    });
                }
            }
        }
        userAnswerEntries.sort((a, b) => new Date(b.answer.createdAt).getTime() - new Date(a.answer.createdAt).getTime());
        return userAnswerEntries;
    } catch (error) {
        console.error('Error fetching answers by author ID for profile:', error);
        return [];
    }
}


async function fetchProfilePageData(userId: string): Promise<ProfileData> {
    if (!MONGODB_URI || !MONGODB_DB_NAME) {
        return { fetchedUser: null, userQuestions: [], userAnswers: [], dbConfigured: false, profileUserId: userId };
    }

    try {
        const db = await connectToDatabase();
        const usersCollection = db.collection<UserDBDocument>('users');
        const userDoc = await getUserById(userId, db);

        if (!userDoc) {
            return { fetchedUser: null, userQuestions: [], userAnswers: [], dbConfigured: true, profileUserId: userId };
        }
        const questions = await getQuestionsByAuthorId(userDoc._id.toString(), db, usersCollection);
        const answers = await getAnswersByAuthorId(userDoc._id.toString(), db, usersCollection);
        return { fetchedUser: userDoc, userQuestions: questions, userAnswers: answers, dbConfigured: true, profileUserId: userId };

    } catch (dbError) {
        console.error("ProfilePage: Database error during data fetching", dbError);
        return { fetchedUser: null, userQuestions: [], userAnswers: [], dbConfigured: true, profileUserId: userId }; 
    }
}


export default async function ProfilePage({ params }: ProfilePageProps) {
  const profileData = await fetchProfilePageData(params.userId);

  if (!profileData.dbConfigured) {
     return (
        <div className="text-center py-12 bg-destructive/10 p-6 rounded-lg max-w-2xl mx-auto">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-semibold text-destructive">Database Not Configured</h1>
          <p className="text-muted-foreground mt-2">
            This page requires MongoDB connection details. Please ensure MONGODB_URI and MONGODB_DB_NAME are correctly set up in your environment variables.
          </p>
        </div>
      );
  }

  if (!profileData.fetchedUser) {
    notFound(); // For Server Components, notFound() is appropriate
  }
  
  return <ProfileClientLayout profileData={profileData} />;
}
