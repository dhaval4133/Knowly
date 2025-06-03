
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
  bookmarkedQuestionIds?: ObjectId[]; // Ensure this field exists
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

// Plain user object for client component props
export interface PlainProfileUser {
  _id: string;
  name: string;
  email?: string;
  createdAt: string; // ISO string
  avatarUrl?: string;
  bookmarkedQuestionIds?: string[]; // Ensure this field exists as string array
}

export interface ProfileData {
  fetchedUser: PlainProfileUser | null;
  userQuestions: PopulatedQuestion[];
  userAnswers: UserAnswerEntry[];
  userBookmarkedQuestions: PopulatedQuestion[];
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
    return await db.collection<UserDBDocument>('users').findOne(
        { _id: new ObjectId(userId) },
        // Use an inclusive projection: list only fields to include. 'password' will be excluded by default.
        { projection: { name: 1, email: 1, createdAt: 1, avatarUrl: 1, bookmarkedQuestionIds: 1 } }
    );
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
        const questionDocs = await questionsCollection.find({ authorId: authorObjectId })
          .project({ 'answers.content': 0 })
          .sort({ updatedAt: -1 })
          .toArray();

        const profileAuthorDoc = await usersCollection.findOne({ _id: authorObjectId });
        const profileAuthor: UserType = profileAuthorDoc ? {
            id: profileAuthorDoc._id.toString(),
            name: profileAuthorDoc.name,
            avatarUrl: profileAuthorDoc.avatarUrl || `https://placehold.co/100x100.png?text=${profileAuthorDoc.name[0]?.toUpperCase() || 'U'}`,
        } : { ...defaultAuthor, id: authorIdString };


        return questionDocs.map(qDoc => {
            const populatedAnswers = (qDoc.answers || []).map(ans => {
                const ansId = typeof ans._id === 'string' ? ans._id : ans._id.toString();
                return {
                    id: ansId,
                    author: defaultAuthor,
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
        const profileUserDoc = await usersCollection.findOne({ _id: profileUserObjectId }, { projection: { name: 1, avatarUrl: 1 } });
        if (!profileUserDoc) return [];

        const profileUserType: UserType = {
            id: profileUserDoc._id.toString(), name: profileUserDoc.name,
            avatarUrl: profileUserDoc.avatarUrl || `https://placehold.co/100x100.png?text=${profileUserDoc.name[0]?.toUpperCase() || 'U'}`,
        };

        const questionDocs = await questionsCollection.find(
          { "answers.authorId": profileUserIdString },
          {
            projection: {
              _id: 1,
              title: 1,
              answers: { $elemMatch: { authorId: profileUserIdString } }
            }
          }
        ).toArray();

        const userAnswerEntries: UserAnswerEntry[] = [];

        for (const qDoc of questionDocs) {
            for (const ans of (qDoc.answers || [])) {
                if (ans.authorId.toString() === profileUserIdString) {
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

async function getBookmarkedQuestions(bookmarkedIds: ObjectId[] | undefined, db: Db): Promise<PopulatedQuestion[]> {
    if (!bookmarkedIds || bookmarkedIds.length === 0) return [];
    const defaultAuthor: UserType = { id: 'unknown', name: 'Unknown User', avatarUrl: 'https://placehold.co/100x100.png?text=U' };
    try {
        const questionsCollection = db.collection<QuestionDBDocument>('questions');
        const usersCollection = db.collection<UserDBDocument>('users');

        const questionDocs = await questionsCollection.find({ _id: { $in: bookmarkedIds } })
            .project({ 'answers.content': 0 })
            .sort({ updatedAt: -1 })
            .toArray();

        const authorIds = new Set<ObjectId>();
        questionDocs.forEach(qDoc => authorIds.add(qDoc.authorId));

        const authorsArray = await usersCollection.find({ _id: { $in: Array.from(authorIds) } }).toArray();
        const authorsMap = new Map<string, UserType>();
        authorsArray.forEach(authorDoc => {
            authorsMap.set(authorDoc._id.toString(), {
                id: authorDoc._id.toString(), name: authorDoc.name,
                avatarUrl: authorDoc.avatarUrl || `https://placehold.co/100x100.png?text=${authorDoc.name[0]?.toUpperCase() || 'U'}`,
            });
        });

        return questionDocs.map(qDoc => {
            const questionAuthor = authorsMap.get(qDoc.authorId.toString()) || defaultAuthor;
            const populatedAnswers = (qDoc.answers || []).map(ans => ({
                id: typeof ans._id === 'string' ? ans._id : ans._id.toString(),
                author: defaultAuthor,
                createdAt: ans.createdAt ? new Date(ans.createdAt).toISOString() : new Date(0).toISOString(),
                upvotes: ans.upvotes,
                downvotes: ans.downvotes,
            }));
            return {
                id: qDoc._id.toString(), title: qDoc.title, description: qDoc.description,
                tags: qDoc.tags.map(tag => ({ id: tag, name: tag })), author: questionAuthor,
                createdAt: qDoc.createdAt ? new Date(qDoc.createdAt).toISOString() : new Date(0).toISOString(),
                updatedAt: qDoc.updatedAt ? new Date(qDoc.updatedAt).toISOString() : new Date(0).toISOString(),
                upvotes: qDoc.upvotes, downvotes: qDoc.downvotes, views: qDoc.views, answers: populatedAnswers,
            };
        });
    } catch (error) {
        console.error('Error fetching bookmarked questions:', error);
        return [];
    }
}


async function fetchProfilePageData(userId: string): Promise<ProfileData> {
    if (!MONGODB_URI || !MONGODB_DB_NAME) {
        return { fetchedUser: null, userQuestions: [], userAnswers: [], userBookmarkedQuestions: [], dbConfigured: false, profileUserId: userId };
    }

    try {
        const db = await connectToDatabase();
        const usersCollection = db.collection<UserDBDocument>('users');
        const userDoc = await getUserById(userId, db);

        if (!userDoc) {
            return { fetchedUser: null, userQuestions: [], userAnswers: [], userBookmarkedQuestions: [], dbConfigured: true, profileUserId: userId };
        }

        const plainFetchedUser: PlainProfileUser = {
            _id: userDoc._id.toString(),
            name: userDoc.name,
            email: userDoc.email,
            createdAt: userDoc.createdAt ? new Date(userDoc.createdAt).toISOString() : new Date(0).toISOString(),
            avatarUrl: userDoc.avatarUrl,
            bookmarkedQuestionIds: (userDoc.bookmarkedQuestionIds || []).map(id => id.toString()),
        };

        const questions = await getQuestionsByAuthorId(userDoc._id.toString(), db, usersCollection);
        const answers = await getAnswersByAuthorId(userDoc._id.toString(), db, usersCollection);
        const bookmarkedQuestions = await getBookmarkedQuestions(userDoc.bookmarkedQuestionIds, db);

        return {
            fetchedUser: plainFetchedUser,
            userQuestions: questions,
            userAnswers: answers,
            userBookmarkedQuestions: bookmarkedQuestions,
            dbConfigured: true,
            profileUserId: userId
        };

    } catch (dbError) {
        console.error("ProfilePage: Database error during data fetching", dbError);
        return { fetchedUser: null, userQuestions: [], userAnswers: [], userBookmarkedQuestions: [], dbConfigured: true, profileUserId: userId };
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
    notFound();
  }

  return <ProfileClientLayout profileData={profileData} />;
}
