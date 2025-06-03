
import type { Question as PopulatedQuestion, User as UserType } from '@/lib/types';
import QuestionCard from '@/components/question/question-card';
import { AlertTriangle } from 'lucide-react';
import { MongoClient, Db, ObjectId, WithId, Filter } from 'mongodb';
import type { AnswerData, QuestionData } from '@/lib/types';
// import RealtimeUpdateTrigger from '@/components/utils/realtime-update-trigger'; // Removed for consistency

interface TagPageProps {
  params: { tagName: string };
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

interface UserDBDocument extends WithId<Document> {
  _id: ObjectId;
  name: string;
  avatarUrl?: string;
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
      console.warn('Cached MongoDB connection lost for tag page, attempting to reconnect...', e);
      cachedClient = null;
      cachedDb = null;
    }
  }
  if (!MONGODB_URI || !MONGODB_DB_NAME) {
    throw new Error('MongoDB URI or DB Name not configured for tag page.');
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

async function getQuestionsByTag(tagName: string): Promise<PopulatedQuestion[]> {
  try {
    const db = await connectToDatabase();
    const questionsCollection = db.collection<QuestionDBDocument>('questions');
    const usersCollection = db.collection<UserDBDocument>('users');

    const query: Filter<QuestionDBDocument> = { tags: { $regex: `^${tagName}$`, $options: 'i' } };

    const questionDocs = await questionsCollection.find(query).sort({ updatedAt: -1 }).toArray();

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
          createdAt: ans.createdAt ? new Date(ans.createdAt).toISOString() : new Date(0).toISOString(),
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

    return populatedQuestions;
  } catch (error) {
    console.error(`Error fetching questions for tag "${tagName}":`, error);
    return [];
  }
}

export default async function TagPage({ params }: TagPageProps) {
  const tagName = decodeURIComponent(params.tagName); // Ensure tag name is decoded
  const questions = await getQuestionsByTag(tagName);

  if (!MONGODB_URI || !MONGODB_DB_NAME) {
     return (
        <div className="text-center py-12 bg-destructive/10 p-6 rounded-lg max-w-2xl mx-auto">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-semibold text-destructive">Database Not Configured</h1>
          <p className="text-muted-foreground mt-2">
            This page requires MongoDB connection details. Please ensure MONGODB_URI and MONGODB_DB_NAME are correctly set up.
          </p>
        </div>
      );
  }

  return (
    <div className="space-y-8">
      {/* <RealtimeUpdateTrigger intervalMs={15000} /> Removed */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary">
          Questions tagged with <span className="bg-accent/20 text-accent px-2 py-1 rounded-md">{tagName}</span>
        </h1>
      </header>

      {questions.length > 0 ? (
        <div className="space-y-6">
          {questions.map((question) => (
            <QuestionCard key={question.id} question={question} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-muted-foreground">
            No questions found for the tag "{tagName}".
          </h2>
          <p className="text-muted-foreground">
            Why not <a href="/ask" className="text-primary hover:underline">ask a new question</a> with this tag?
          </p>
        </div>
      )}
    </div>
  );
}
