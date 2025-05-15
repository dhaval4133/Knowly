
import type { Question as PopulatedQuestion, Answer as PopulatedAnswer, User as UserType } from '@/lib/types';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import TagBadge from '@/components/shared/tag-badge';
import VoteButtons from '@/components/shared/vote-buttons';
import AnswerCard from '@/components/question/answer-card';
import AnswerForm from '@/components/question/answer-form';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { MongoClient, Db, ObjectId, WithId } from 'mongodb';
import type { AnswerData } from '@/lib/types';

interface QuestionPageProps {
  params: { id: string };
}

// Define a more specific type for Question documents from MongoDB
interface QuestionDBDocument {
  _id: ObjectId;
  title: string;
  description: string;
  tags: string[]; // Tags stored as strings
  authorId: ObjectId;
  createdAt: Date;
  upvotes: number;
  downvotes: number;
  answers: AnswerData[]; // Array of AnswerData objects, could be more complex with embedded authors
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
    throw new Error('MongoDB URI or DB Name not configured for question detail page.');
  }
  cachedClient = new MongoClient(MONGODB_URI);
  await cachedClient.connect();
  cachedDb = cachedClient.db(MONGODB_DB_NAME);
  return cachedDb;
}

async function fetchQuestionById(id: string): Promise<PopulatedQuestion | null> {
  if (!ObjectId.isValid(id)) {
    console.warn('Invalid question ID format for fetchQuestionById:', id);
    return null;
  }

  try {
    const db = await connectToDatabase();
    const questionsCollection = db.collection<QuestionDBDocument>('questions');
    const usersCollection = db.collection<UserDBDocument>('users');

    const questionDoc = await questionsCollection.findOne({ _id: new ObjectId(id) });

    if (!questionDoc) {
      return null;
    }

    // Collect all authorIds that need fetching (question author + answer authors)
    const authorIdsToFetch = new Set<ObjectId>();
    authorIdsToFetch.add(questionDoc.authorId);
    (questionDoc.answers || []).forEach(ans => {
      if (ans.authorId && ObjectId.isValid(ans.authorId.toString())) {
        authorIdsToFetch.add(new ObjectId(ans.authorId.toString()));
      }
    });
    
    const uniqueAuthorIdsArray = Array.from(authorIdsToFetch);
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

    const questionAuthor = authorsMap.get(questionDoc.authorId.toString()) || defaultAuthor;

    const populatedAnswers: PopulatedAnswer[] = (questionDoc.answers || []).map(ans => {
      const answerAuthor = authorsMap.get(ans.authorId.toString()) || defaultAuthor;
      return {
        id: (ans._id || new ObjectId()).toString(), // Ensure ans has an id or generate one
        content: ans.content,
        author: answerAuthor,
        createdAt: new Date(ans.createdAt).toISOString(),
        upvotes: ans.upvotes,
        downvotes: ans.downvotes,
      };
    });

    return {
      id: questionDoc._id.toString(),
      title: questionDoc.title,
      description: questionDoc.description,
      tags: questionDoc.tags.map(tag => ({ id: tag, name: tag })), // Map string[] to Tag[]
      author: questionAuthor,
      createdAt: new Date(questionDoc.createdAt).toISOString(),
      upvotes: questionDoc.upvotes,
      downvotes: questionDoc.downvotes,
      answers: populatedAnswers,
    };
  } catch (error) {
    console.error('Error fetching question by ID:', error);
    // Let notFound handle it if an error occurs during DB fetch
    return null; 
  }
}

export default async function QuestionPage({ params }: QuestionPageProps) {
  if (!MONGODB_URI || !MONGODB_DB_NAME) {
     return (
        <div className="text-center py-12 bg-destructive/10 p-6 rounded-lg">
          <h1 className="text-2xl font-semibold text-destructive">Database Not Configured</h1>
          <p className="text-muted-foreground mt-2">
            This page requires MongoDB connection details. Please configure MONGODB_URI and MONGODB_DB_NAME.
          </p>
        </div>
      );
  }
  
  const question = await fetchQuestionById(params.id);

  if (!question) {
    notFound();
  }

  const questionAuthorInitials = question.author.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  const questionTimeAgo = formatDistanceToNow(new Date(question.createdAt), { addSuffix: true });

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-2xl md:text-3xl font-bold">{question.title}</CardTitle>
            <VoteButtons initialUpvotes={question.upvotes} initialDownvotes={question.downvotes} itemId={question.id} itemType="question" />
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={question.author.avatarUrl} alt={question.author.name} data-ai-hint="user avatar" />
              <AvatarFallback>{questionAuthorInitials}</AvatarFallback>
            </Avatar>
            <span>Asked by {question.author.name}</span>
            <span>&bull;</span>
            <time dateTime={question.createdAt}>{questionTimeAgo}</time>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {question.tags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert max-w-none text-foreground/90 whitespace-pre-wrap text-base">
            {question.description}
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">
          {question.answers.length} Answer{question.answers.length !== 1 ? 's' : ''}
        </h2>
        {question.answers.length > 0 ? (
          question.answers.map((answer) => (
            <AnswerCard key={answer.id} answer={answer} />
          ))
        ) : (
          <p className="text-muted-foreground">No answers yet. Be the first to provide a solution!</p>
        )}
      </div>

      <Separator />

      <div>
        <h2 className="text-2xl font-semibold mb-4">Your Answer</h2>
        {/* Note: AnswerForm currently uses mock submission logic */}
        <AnswerForm questionId={question.id} />
      </div>
    </div>
  );
}
