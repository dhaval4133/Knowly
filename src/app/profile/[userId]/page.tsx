
import type { User as UserType, Question as PopulatedQuestion, Answer as PopulatedAnswer } from '@/lib/types';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import QuestionCard from '@/components/question/question-card';
import AnswerCard from '@/components/question/answer-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MongoClient, Db, ObjectId, WithId } from 'mongodb';
import type { AnswerData, QuestionData } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';


interface ProfilePageProps {
  params: { userId: string };
}

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


// Structure to hold a user's answer along with context of the question it belongs to
interface UserAnswerEntry {
  answer: PopulatedAnswer;
  question: {
    id: string;
    title: string;
  };
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

  if (!cachedClient) {
    if (!MONGODB_URI || !MONGODB_DB_NAME) {
      throw new Error('MongoDB URI or DB Name not configured for profile page.');
    }
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

async function getUserById(userId: string): Promise<UserDBDocument | null> {
  if (!ObjectId.isValid(userId)) {
    console.warn('Invalid userId format for profile page (getUserById):', userId);
    return null;
  }
  try {
    const db = await connectToDatabase();
    const usersCollection = db.collection<UserDBDocument>('users');
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });
    return user;
  } catch (error) {
    console.error('Error fetching user from DB for profile page:', error);
    if (error instanceof Error && (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv ESERVFAIL') || error.message.includes('Authentication failed'))) {
      throw new Error(`Database connection issue for profile page (getUserById): ${error.message}`);
    }
    return null;
  }
}

async function getQuestionsByAuthorId(authorIdString: string): Promise<PopulatedQuestion[]> {
  if (!ObjectId.isValid(authorIdString)) {
    console.warn('Invalid authorIdString format for getQuestionsByAuthorId:', authorIdString);
    return [];
  }
  const defaultAuthor: UserType = { id: 'unknown', name: 'Unknown User', avatarUrl: 'https://placehold.co/100x100.png?text=U' };

  try {
    const db = await connectToDatabase();
    const questionsCollection = db.collection<QuestionDBDocument>('questions');
    const usersCollection = db.collection<UserDBDocument>('users'); 
    const authorObjectId = new ObjectId(authorIdString);

    const questionDocs = await questionsCollection.find({ authorId: authorObjectId }).sort({ updatedAt: -1 }).toArray();
    
    // Fetch only the main author for the questions list, as QuestionCard doesn't show answer authors.
    const profileAuthorDoc = await usersCollection.findOne({ _id: authorObjectId });
    if (!profileAuthorDoc) {
        console.warn(`Author ${authorIdString} not found for their own questions.`);
        return []; 
    }
    const profileAuthor: UserType = {
      id: profileAuthorDoc._id.toString(),
      name: profileAuthorDoc.name,
      avatarUrl: profileAuthorDoc.avatarUrl || `https://placehold.co/100x100.png?text=${profileAuthorDoc.name[0]?.toUpperCase() || 'U'}`,
    };

    const populatedQuestions: PopulatedQuestion[] = questionDocs.map(qDoc => {
      // For QuestionCard on profile, only answer count is needed.
      // Populate answers with defaultAuthor to satisfy types.
      const populatedAnswers = (qDoc.answers || []).map(ans => {
         const ansId = typeof ans._id === 'string' ? ans._id : ans._id.toString();
        return {
          id: ansId,
          content: ans.content,
          author: defaultAuthor, // QuestionCard does not use this
          createdAt: ans.createdAt && (ans.createdAt instanceof Date || !isNaN(new Date(ans.createdAt).getTime())) ? new Date(ans.createdAt).toISOString() : new Date(0).toISOString(),
          upvotes: ans.upvotes,
          downvotes: ans.downvotes,
        };
      });

      const validCreatedAt = qDoc.createdAt && (qDoc.createdAt instanceof Date || !isNaN(new Date(qDoc.createdAt).getTime())) ? new Date(qDoc.createdAt).toISOString() : new Date(0).toISOString();
      const validUpdatedAt = qDoc.updatedAt && (qDoc.updatedAt instanceof Date || !isNaN(new Date(qDoc.updatedAt).getTime())) ? new Date(qDoc.updatedAt).toISOString() : validCreatedAt;


      return {
        id: qDoc._id.toString(),
        title: qDoc.title,
        description: qDoc.description,
        tags: qDoc.tags.map(tag => ({ id: tag, name: tag })), 
        author: profileAuthor, // This is the author of the question itself
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
    console.error('Error fetching questions by author ID for profile:', error);
    if (error instanceof Error && (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv ESERVFAIL') || error.message.includes('Authentication failed'))) {
      throw new Error(`Database connection issue for getQuestionsByAuthorId: ${error.message}`);
    }
    return [];
  }
}

async function getAnswersByAuthorId(profileUserIdString: string): Promise<UserAnswerEntry[]> {
  if (!ObjectId.isValid(profileUserIdString)) {
    console.warn('Invalid profileUserIdString format for getAnswersByAuthorId:', profileUserIdString);
    return [];
  }

  try {
    const db = await connectToDatabase();
    const questionsCollection = db.collection<QuestionDBDocument>('questions');
    const usersCollection = db.collection<UserDBDocument>('users');

    const profileUserObjectId = new ObjectId(profileUserIdString);
    const profileUserDoc = await usersCollection.findOne({ _id: profileUserObjectId });

    if (!profileUserDoc) {
      console.warn(`Profile user ${profileUserIdString} not found for getAnswersByAuthorId.`);
      return [];
    }

    const profileUserType: UserType = {
      id: profileUserDoc._id.toString(),
      name: profileUserDoc.name,
      avatarUrl: profileUserDoc.avatarUrl || `https://placehold.co/100x100.png?text=${profileUserDoc.name[0]?.toUpperCase() || 'U'}`,
    };
    
    // Find questions where this user has posted an answer
    // The authorId in answers can be a string or ObjectId, so we query for string.
    const questionDocs = await questionsCollection.find({ "answers.authorId": profileUserIdString }).sort({"answers.createdAt": -1}).toArray();
    
    const userAnswerEntries: UserAnswerEntry[] = [];

    for (const qDoc of questionDocs) {
      for (const ans of (qDoc.answers || [])) {
        // Ensure comparison is string-to-string or handle ObjectId if ans.authorId is ObjectId
        const answerAuthorIdStr = ans.authorId.toString();
        if (answerAuthorIdStr === profileUserIdString) {
          const ansId = typeof ans._id === 'string' ? ans._id : ans._id.toString();
          const populatedAnswer: PopulatedAnswer = {
            id: ansId,
            content: ans.content,
            author: profileUserType, // The author of this answer is the profile user
            createdAt: ans.createdAt && (ans.createdAt instanceof Date || !isNaN(new Date(ans.createdAt).getTime())) ? new Date(ans.createdAt).toISOString() : new Date(0).toISOString(),
            upvotes: ans.upvotes,
            downvotes: ans.downvotes,
          };
          userAnswerEntries.push({
            answer: populatedAnswer,
            question: {
              id: qDoc._id.toString(),
              title: qDoc.title,
            },
          });
        }
      }
    }
    // Sort answers by their own creation date, newest first
    userAnswerEntries.sort((a, b) => new Date(b.answer.createdAt).getTime() - new Date(a.answer.createdAt).getTime());

    return userAnswerEntries;
  } catch (error) {
    console.error('Error fetching answers by author ID for profile:', error);
    if (error instanceof Error && (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv ESERVFAIL') || error.message.includes('Authentication failed'))) {
      throw new Error(`Database connection issue for getAnswersByAuthorId: ${error.message}`);
    }
    return [];
  }
}


export default async function ProfilePage({ params }: ProfilePageProps) {
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

  let fetchedUser: UserDBDocument | null = null;
  let userQuestions: PopulatedQuestion[] = [];
  let userAnswers: UserAnswerEntry[] = [];

  try {
    fetchedUser = await getUserById(params.userId);
    if (fetchedUser) {
      userQuestions = await getQuestionsByAuthorId(fetchedUser._id.toString());
      userAnswers = await getAnswersByAuthorId(fetchedUser._id.toString());
    }
  } catch (dbError) {
     console.error("ProfilePage: Database error during data fetching", dbError);
  }

  if (!fetchedUser) {
    notFound();
  }
  
  const displayUser: UserType = {
    id: fetchedUser._id.toString(),
    name: fetchedUser.name,
    avatarUrl: fetchedUser.avatarUrl || `https://placehold.co/128x128.png?text=${fetchedUser.name[0]?.toUpperCase() || 'U'}`,
  };

  const initials = displayUser.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  const memberSince = fetchedUser.createdAt ? new Date(fetchedUser.createdAt).toLocaleDateString() : 'N/A';

  return (
    <div className="space-y-8">
      <Card className="shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-accent h-32 md:h-40" data-ai-hint="abstract banner mountains"></div>
        <CardHeader className="flex flex-col items-center text-center -mt-16 md:-mt-20 relative p-6">
          <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-lg">
            <AvatarImage src={displayUser.avatarUrl} alt={displayUser.name} data-ai-hint="user avatar" />
            <AvatarFallback className="text-4xl">{initials}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl font-bold mt-4">{displayUser.name}</CardTitle>
          <p className="text-muted-foreground">Member since {memberSince}</p>
          <p className="mt-2 max-w-md text-foreground/80">
            Passionate learner and contributor at Knowly. Always eager to help and explore new ideas.
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="questions" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-1/2 mx-auto">
          <TabsTrigger value="questions">My Questions ({userQuestions.length})</TabsTrigger>
          <TabsTrigger value="answers">My Answers ({userAnswers.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="questions" className="mt-6 space-y-6">
          {userQuestions.length > 0 ? (
            userQuestions.map(question => (
              <QuestionCard key={question.id} question={question} />
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">You haven&apos;t asked any questions yet.</p>
          )}
        </TabsContent>
        <TabsContent value="answers" className="mt-6 space-y-4">
            {userAnswers.length > 0 ? (
                userAnswers.map(entry => (
                    <Card key={entry.answer.id} className="shadow-md">
                        <CardHeader className="pb-2">
                            <p className="text-sm text-muted-foreground">
                                Answered on: <Link href={`/questions/${entry.question.id}`} className="text-primary hover:underline font-medium">{entry.question.title}</Link>
                                <span className="mx-1">&bull;</span>
                                {formatDistanceToNow(new Date(entry.answer.createdAt), { addSuffix: true })}
                            </p>
                        </CardHeader>
                        <CardContent>
                            <AnswerCard answer={entry.answer} />
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-end">
                            <Button asChild variant="outline" size="sm">
                                <Link href={`/questions/${entry.question.id}`}>
                                    View Full Question
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))
            ) : (
                 <p className="text-center text-muted-foreground py-8">You haven&apos;t answered any questions yet.</p>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
