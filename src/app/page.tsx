
import type { Question as PopulatedQuestion, User as UserType } from '@/lib/types';
import QuestionCard from '@/components/question/question-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, AlertTriangle } from 'lucide-react';
import { MongoClient, Db, ObjectId, WithId } from 'mongodb';
import type { AnswerData, QuestionData } from '@/lib/types';

// Define a more specific type for Question documents from MongoDB
interface QuestionDBDocument extends QuestionData { // Inherits fields from QuestionData
  _id: ObjectId;
  authorId: ObjectId;
  answers: AnswerDBDocument[]; // Use specific DB type for answers if different
}

interface AnswerDBDocument extends AnswerData { // Inherits fields from AnswerData
    _id: ObjectId; // Ensure _id is ObjectId for direct DB type
    authorId: ObjectId;
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
      cachedClient = null;
      cachedDb = null;
    }
  }
  if (!MONGODB_URI || !MONGODB_DB_NAME) {
    throw new Error('MongoDB URI or DB Name not configured for homepage.');
  }
  cachedClient = new MongoClient(MONGODB_URI);
  await cachedClient.connect();
  cachedDb = cachedClient.db(MONGODB_DB_NAME);
  return cachedDb;
}

async function getAllQuestions(): Promise<PopulatedQuestion[]> {
  try {
    const db = await connectToDatabase();
    const questionsCollection = db.collection<QuestionDBDocument>('questions');
    const usersCollection = db.collection<UserDBDocument>('users');

    // Sort by updatedAt descending for most recent activity
    const questionDocs = await questionsCollection.find().sort({ updatedAt: -1 }).toArray();
    
    const authorIds = new Set<ObjectId>();
    questionDocs.forEach(qDoc => {
      authorIds.add(qDoc.authorId);
      (qDoc.answers || []).forEach(ans => {
        if (ans.authorId && ObjectId.isValid(ans.authorId.toString())) {
           // Ensure ans.authorId is treated as ObjectId if it's stored as string ObjectId
          authorIds.add(new ObjectId(ans.authorId.toString()));
        }
      });
    });
    
    const uniqueAuthorIdsArray = Array.from(authorIds);

    const authorsArray = await usersCollection.find({ _id: { $in: uniqueAuthorIdsArray } }).toArray();
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
        // ans.authorId is string here from AnswerData, convert to string for map lookup
        const answerAuthor = authorsMap.get(ans.authorId.toString()) || defaultAuthor;
        return {
          id: ans._id.toString(), // ans._id is string
          content: ans.content,
          author: answerAuthor,
          createdAt: new Date(ans.createdAt).toISOString(), // ans.createdAt is Date
          upvotes: ans.upvotes,
          downvotes: ans.downvotes,
        };
      });

      return {
        id: qDoc._id.toString(),
        title: qDoc.title,
        description: qDoc.description,
        tags: qDoc.tags.map(tag => ({ id: tag, name: tag })), 
        author: questionAuthor,
        createdAt: new Date(qDoc.createdAt).toISOString(),
        updatedAt: new Date(qDoc.updatedAt).toISOString(),
        upvotes: qDoc.upvotes,
        downvotes: qDoc.downvotes,
        views: qDoc.views, // Include views
        answers: populatedAnswers,
      };
    });

    return populatedQuestions;
  } catch (error) {
    console.error('Error fetching questions for homepage:', error);
    return []; 
  }
}


export default async function Home() {
  const questions = await getAllQuestions();

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-2">Welcome to Knowly</h1>
        <p className="text-lg text-muted-foreground">
          Your community for sharing knowledge and finding answers.
        </p>
      </div>

      <div className="flex w-full max-w-2xl mx-auto items-center space-x-2">
        <Input type="search" placeholder="Search questions by keyword or tag..." className="flex-grow" />
        <Button type="submit" variant="default">
          <Search className="mr-2 h-4 w-4" /> Search
        </Button>
      </div>

      {MONGODB_URI && MONGODB_DB_NAME ? (
        <div className="space-y-6">
          {questions.map((question) => (
            <QuestionCard key={question.id} question={question} />
          ))}
        </div>
      ) : (
         <div className="text-center py-12 bg-destructive/10 p-6 rounded-lg">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h2 className="text-2xl font-semibold text-destructive">Database Not Configured</h2>
          <p className="text-muted-foreground mt-2">
            The application requires MongoDB connection details (MONGODB_URI and MONGODB_DB_NAME) to be set in environment variables.
            Please configure them to see and post questions.
          </p>
        </div>
      )}


      {questions.length === 0 && MONGODB_URI && MONGODB_DB_NAME && (
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-muted-foreground">No questions yet!</h2>
          <p className="text-muted-foreground">Be the first to <a href="/ask" className="text-primary hover:underline">ask a question</a> and spark a discussion.</p>
        </div>
      )}
    </div>
  );
}
