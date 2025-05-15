
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
import type { AnswerData, QuestionData } from '@/lib/types';
import RealtimeUpdateTrigger from '@/components/utils/realtime-update-trigger';

interface QuestionPageProps {
  params: { id: string };
}

// Specific type for Question documents from MongoDB, extending QuestionData
interface QuestionDBDocument extends QuestionData {
  _id: ObjectId;
  authorId: ObjectId;
  // answers already defined in QuestionData as AnswerData[]
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
      console.warn('Cached MongoDB connection lost for question detail page, attempting to reconnect...', e);
      cachedClient = null;
      cachedDb = null;
    }
  }
   if (!MONGODB_URI || !MONGODB_DB_NAME) {
    throw new Error('MongoDB URI or DB Name not configured for question detail page.');
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

async function fetchQuestionById(id: string): Promise<PopulatedQuestion | null> {
  if (!ObjectId.isValid(id)) {
    console.warn('Invalid question ID format for fetchQuestionById:', id);
    return null;
  }

  try {
    const db = await connectToDatabase();
    const questionsCollection = db.collection<QuestionDBDocument>('questions');
    const usersCollection = db.collection<UserDBDocument>('users');
    const questionObjectId = new ObjectId(id);
    
    const questionDoc = await questionsCollection.findOne({ _id: questionObjectId });

    if (!questionDoc) {
      return null;
    }

    await questionsCollection.updateOne(
      { _id: questionObjectId },
      { $inc: { views: 1 } }
    );
    const currentViews = (questionDoc.views || 0) + 1; 

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
      const ansId = typeof ans._id === 'string' ? ans._id : ans._id.toString();
      return {
        id: ansId, 
        content: ans.content,
        author: answerAuthor,
        createdAt: ans.createdAt && (ans.createdAt instanceof Date || !isNaN(new Date(ans.createdAt).getTime())) ? new Date(ans.createdAt).toISOString() : new Date(0).toISOString(),
        upvotes: ans.upvotes,
        downvotes: ans.downvotes,
      };
    });
    
    const validCreatedAt = questionDoc.createdAt && (questionDoc.createdAt instanceof Date || !isNaN(new Date(questionDoc.createdAt).getTime())) ? new Date(questionDoc.createdAt).toISOString() : new Date(0).toISOString();
    const validUpdatedAt = questionDoc.updatedAt && (questionDoc.updatedAt instanceof Date || !isNaN(new Date(questionDoc.updatedAt).getTime())) ? new Date(questionDoc.updatedAt).toISOString() : validCreatedAt;


    return {
      id: questionDoc._id.toString(),
      title: questionDoc.title,
      description: questionDoc.description,
      tags: questionDoc.tags.map(tag => ({ id: tag, name: tag })),
      author: questionAuthor,
      createdAt: validCreatedAt,
      updatedAt: validUpdatedAt,
      upvotes: questionDoc.upvotes,
      downvotes: questionDoc.downvotes,
      views: currentViews, 
      answers: populatedAnswers,
    };
  } catch (error) {
    console.error('Error fetching question by ID:', error);
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
  const askedOrModifiedText = new Date(question.createdAt).getTime() === new Date(question.updatedAt).getTime()
    ? `Asked ${questionTimeAgo}` 
    : `Modified ${formatDistanceToNow(new Date(question.updatedAt), { addSuffix: true })}`;

  return (
    <div className="space-y-8">
      <RealtimeUpdateTrigger intervalMs={15000} />
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
            <span>{question.author.name}</span>
            <span>&bull;</span>
            <time dateTime={question.updatedAt}>{askedOrModifiedText}</time>
            <span>&bull;</span>
            <span>{question.views} views</span>
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

      <div id="your-answer-section">
        <h2 className="text-2xl font-semibold mb-4">Your Answer</h2>
        <AnswerForm questionId={question.id} />
      </div>
    </div>
  );
}
