
import type { Question as PopulatedQuestion, User as UserType } from '@/lib/types';
import QuestionCard from '@/components/question/question-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { MongoClient, Db, ObjectId, WithId, Filter } from 'mongodb';
import type { AnswerData, QuestionData } from '@/lib/types';
// import RealtimeUpdateTrigger from '@/components/utils/realtime-update-trigger';

// Define a more specific type for Question documents from MongoDB
interface QuestionDBDocument extends QuestionData { // Inherits fields from QuestionData
  _id: ObjectId;
  authorId: ObjectId;
  answers: AnswerDBDocument[]; // Use specific DB type for answers if different
}

interface AnswerDBDocument extends AnswerData { // Inherits fields from AnswerData
    _id: ObjectId | string; // Can be ObjectId or string from older data or newly pushed answers
    authorId: ObjectId | string; // Can be ObjectId or string
}


interface UserDBDocument extends WithId<Document> {
  _id: ObjectId;
  name: string;
  avatarUrl?: string;
}

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;
const QUESTIONS_PER_PAGE = 10; // Number of questions per page

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    try {
      await cachedClient.db(MONGODB_DB_NAME).command({ ping: 1 });
      return cachedDb;
    } catch (e) {
      console.warn('Cached MongoDB connection lost for homepage, attempting to reconnect...', e);
      cachedClient = null;
      cachedDb = null;
    }
  }
  if (!MONGODB_URI || !MONGODB_DB_NAME) {
    throw new Error('MongoDB URI or DB Name not configured for homepage.');
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

interface FetchQuestionsResult {
  questions: PopulatedQuestion[];
  totalQuestions: number;
  currentPage: number;
  totalPages: number;
}

async function getAllQuestions(searchTerm?: string, page: number = 1): Promise<FetchQuestionsResult> {
  try {
    const db = await connectToDatabase();
    const questionsCollection = db.collection<QuestionDBDocument>('questions');
    const usersCollection = db.collection<UserDBDocument>('users');

    const query: Filter<QuestionDBDocument> = {};
    if (searchTerm && searchTerm.trim() !== '') {
      const regex = { $regex: searchTerm, $options: 'i' }; // Case-insensitive search
      query.$or = [
        { title: regex },
        { description: regex },
        { tags: regex } // Also search in tags array
      ];
    }

    const totalQuestions = await questionsCollection.countDocuments(query);
    const totalPages = Math.ceil(totalQuestions / QUESTIONS_PER_PAGE);
    const skipAmount = (page - 1) * QUESTIONS_PER_PAGE;

    // Sort by updatedAt descending for most recent activity
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
        // For QuestionCard, we only need answer count. Populate with defaultAuthor to satisfy types.
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

    return { questions: populatedQuestions, totalQuestions, currentPage: page, totalPages };
  } catch (error) {
    console.error('Error fetching questions for homepage:', error);
    return { questions: [], totalQuestions: 0, currentPage: 1, totalPages: 0 }; 
  }
}

interface HomePageProps {
  searchParams?: {
    search?: string;
    page?: string;
  };
}

export default async function Home({ searchParams }: HomePageProps) {
  const searchTerm = searchParams?.search;
  const currentPage = parseInt(searchParams?.page || '1', 10);
  const { questions, totalQuestions, totalPages } = await getAllQuestions(searchTerm, currentPage);

  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  return (
    <div className="space-y-8">
      {/* <RealtimeUpdateTrigger intervalMs={15000} /> */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-2">Welcome to Knowly</h1>
        <p className="text-lg text-muted-foreground">
          Your community for sharing knowledge and finding answers.
        </p>
      </div>

      <form method="GET" action="/" className="flex w-full max-w-2xl mx-auto items-center space-x-2">
        <Input 
          type="search" 
          name="search"
          placeholder="Search questions by keyword or tag..." 
          className="flex-grow" 
          defaultValue={searchTerm || ''}
        />
        <Button type="submit" variant="default">
          <Search className="mr-2 h-4 w-4" /> Search
        </Button>
      </form>

      {searchTerm && (
        <div className="text-center">
          <p className="text-lg text-muted-foreground">
            Showing results for: <span className="font-semibold text-primary">{searchTerm}</span>
          </p>
        </div>
      )}

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
          <h2 className="text-2xl font-semibold text-muted-foreground">
            {searchTerm ? 'No questions found matching your search.' : 'No questions yet!'}
          </h2>
          <p className="text-muted-foreground">
            {searchTerm ? 'Try a different search term or ' : 'Be the first to '}
            <Link href="/ask" className="text-primary hover:underline">ask a question</Link>
            {searchTerm ? '.' : ' and spark a discussion.'}
          </p>
        </div>
      )}

      {totalQuestions > 0 && MONGODB_URI && MONGODB_DB_NAME && (
        <div className="flex justify-center items-center space-x-4 mt-12">
          {hasPreviousPage ? (
            <Button asChild variant="outline">
              <Link href={`/?${searchTerm ? `search=${encodeURIComponent(searchTerm)}&` : ''}page=${currentPage - 1}`}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Previous
              </Link>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
          )}
          <span className="text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          {hasNextPage ? (
            <Button asChild variant="outline">
              <Link href={`/?${searchTerm ? `search=${encodeURIComponent(searchTerm)}&` : ''}page=${currentPage + 1}`}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" disabled>
               Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
