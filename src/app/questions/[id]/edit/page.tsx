
import { MongoClient, Db, ObjectId } from 'mongodb';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import EditQuestionForm from '@/components/question/edit-question-form';
import type { QuestionData } from '@/lib/types';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface EditQuestionPageProps {
  params: { id: string };
}

interface QuestionDBDocument extends Omit<QuestionData, '_id' | 'authorId' | 'answers' | 'createdAt' | 'updatedAt'> {
  _id: ObjectId;
  authorId: ObjectId;
  answers: any[]; // For simplicity, not fully typed here
  createdAt: Date;
  updatedAt: Date;
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
      console.warn('Cached MongoDB connection lost for edit question page, attempting to reconnect...', e);
      cachedClient = null;
      cachedDb = null;
    }
  }
   if (!MONGODB_URI || !MONGODB_DB_NAME) {
    throw new Error('MongoDB URI or DB Name not configured for edit question page.');
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

async function fetchQuestionForEdit(id: string): Promise<QuestionDBDocument | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  try {
    const db = await connectToDatabase();
    const questionsCollection = db.collection<QuestionDBDocument>('questions');
    return await questionsCollection.findOne({ _id: new ObjectId(id) });
  } catch (error) {
    console.error('Error fetching question for edit:', error);
    return null;
  }
}

export default async function EditQuestionPage({ params }: EditQuestionPageProps) {
  if (!MONGODB_URI || !MONGODB_DB_NAME) {
     return (
        <div className="max-w-3xl mx-auto text-center py-12 bg-destructive/10 p-6 rounded-lg">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-semibold text-destructive">Database Not Configured</h1>
          <p className="text-muted-foreground mt-2">
            Editing questions requires MongoDB connection details (MONGODB_URI and MONGODB_DB_NAME) to be set in environment variables.
          </p>
           <Button asChild className="mt-6">
            <Link href="/"> <ArrowLeft className="mr-2 h-4 w-4" /> Go to Homepage</Link>
          </Button>
        </div>
      );
  }

  const cookieStore = cookies();
  const sessionIdCookie = cookieStore.get('knowly-session-id');
  
  if (!sessionIdCookie || !sessionIdCookie.value || !ObjectId.isValid(sessionIdCookie.value)) {
    redirect(`/login?redirect=/questions/${params.id}/edit`);
  }
  const loggedInUserId = sessionIdCookie.value;

  const questionDoc = await fetchQuestionForEdit(params.id);

  if (!questionDoc) {
    notFound();
  }

  if (questionDoc.authorId.toString() !== loggedInUserId) {
    // User is not the author, show a forbidden message or redirect
    return (
      <div className="max-w-3xl mx-auto text-center py-12 bg-destructive/10 p-6 rounded-lg">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground mt-2">
          You are not authorized to edit this question.
        </p>
        <Button asChild className="mt-6">
          <Link href={`/questions/${params.id}`}> <ArrowLeft className="mr-2 h-4 w-4" /> Back to Question</Link>
        </Button>
      </div>
    );
  }

  // Prepare initial data for the form. Ensure it's serializable.
  const initialFormData = {
    id: questionDoc._id.toString(),
    title: questionDoc.title,
    description: questionDoc.description,
    tags: questionDoc.tags, // Tags are already string[]
  };

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-8">
        <Link href={`/questions/${params.id}`} className="text-sm text-primary hover:underline flex items-center mb-2">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Question
        </Link>
        <h1 className="text-3xl font-bold text-primary">Edit Question</h1>
        <p className="text-muted-foreground mt-1">
          Refine your question to get better answers from the community.
        </p>
      </header>
      <EditQuestionForm initialData={initialFormData} />
    </div>
  );
}

