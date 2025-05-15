
import type { User as UserType, Question } from '@/lib/types'; // Renamed to avoid conflict
import { notFound } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import QuestionCard from '@/components/question/question-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockQuestions, mockUsers } from '@/lib/mock-data'; // Keep mockUsers for answer author placeholder
import { MongoClient, Db, ObjectId } from 'mongodb';
import type { Tag, Answer, User } from '@/lib/types';

interface ProfilePageProps {
  params: { userId: string };
}

interface UserDocument extends UserType {
  _id: ObjectId;
  email?: string;
  createdAt: Date;
  avatarUrl?: string;
}

// Define a more specific type for Question documents from MongoDB
interface QuestionDBDocument {
  _id: ObjectId;
  title: string;
  description: string;
  tags: Tag[]; // Assuming tags are stored in the correct format
  authorId: ObjectId; // Reference to the user who asked
  createdAt: Date;
  upvotes: number;
  downvotes: number;
  answers: any[]; // Keeping answers flexible for now, ideally these would be AnswerDBDocument[]
}


const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable for profile page');
}
if (!MONGODB_DB_NAME) {
 throw new Error('Please define the MONGODB_DB_NAME environment variable for profile page');
}

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
    console.log('No cached client or connection lost for profile page, creating new MongoClient instance.');
    if (!MONGODB_URI) {
      console.error('CRITICAL: MONGODB_URI is not defined at connectToDatabase call for profile page.');
      throw new Error('MONGODB_URI is not defined. This should have been caught by top-level check.');
    }
    cachedClient = new MongoClient(MONGODB_URI);
    try {
      console.log('Attempting to connect to MongoDB for profile page...');
      await cachedClient.connect();
      console.log('MongoDB connected successfully for profile page.');
    } catch (err) {
      console.error('Failed to connect to MongoDB for profile page:', err);
      cachedClient = null;
      throw err;
    }
  }

  if (!MONGODB_DB_NAME) {
    console.error('CRITICAL: MONGODB_DB_NAME is not defined at connectToDatabase call for profile page.');
    throw new Error('MONGODB_DB_NAME is not defined. This should have been caught by top-level check.');
  }
  cachedDb = cachedClient.db(MONGODB_DB_NAME);
  return cachedDb;
}

async function getUserById(userId: string): Promise<UserDocument | null> {
  if (!ObjectId.isValid(userId)) {
    console.warn('Invalid userId format for profile page (getUserById):', userId);
    return null;
  }
  try {
    const db = await connectToDatabase();
    const usersCollection = db.collection<UserDocument>('users');
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });
    return user;
  } catch (error) {
    console.error('Error fetching user from DB for profile page:', error);
    if (error instanceof Error && (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('querySrv ESERVFAIL') ||
        error.message.includes('queryTxt ESERVFAIL') ||
        error.message.includes('bad auth') ||
        error.message.includes('Authentication failed'))) {
      throw new Error(`Database connection issue for profile page (getUserById): ${error.message}`);
    }
    return null;
  }
}

async function getQuestionsByAuthorId(authorIdString: string): Promise<Question[]> {
  if (!ObjectId.isValid(authorIdString)) {
    console.warn('Invalid authorIdString format for getQuestionsByAuthorId:', authorIdString);
    return [];
  }

  try {
    const db = await connectToDatabase();
    const questionsCollection = db.collection<QuestionDBDocument>('questions');
    const usersCollection = db.collection<UserDocument>('users');
    const authorObjectId = new ObjectId(authorIdString);

    const questionDocs = await questionsCollection.find({ authorId: authorObjectId }).sort({ createdAt: -1 }).toArray();
    
    const questions: Question[] = [];

    for (const qDoc of questionDocs) {
      const authorDoc = await usersCollection.findOne({ _id: qDoc.authorId });
      if (!authorDoc) {
        console.warn(`Author not found for question ${qDoc._id.toString()}`);
        continue; 
      }

      const author: User = {
        id: authorDoc._id.toString(),
        name: authorDoc.name as string,
        avatarUrl: (authorDoc.avatarUrl as string | undefined) || `https://placehold.co/100x100.png?text=${authorDoc.name[0]?.toUpperCase() || 'U'}`,
      };
      
      // Map answers: This assumes qDoc.answers is an array of objects that can be mapped to Answer type.
      // If answer authors also need population, this would be more complex.
      const populatedAnswers: Answer[] = (qDoc.answers || []).map((ans: any) => ({
        id: (ans._id || ans.id || new ObjectId()).toString(),
        content: ans.content as string,
        author: (ans.author && ans.author.id) ? { // If author is an object with id
            id: ans.author.id.toString(),
            name: ans.author.name as string,
            avatarUrl: (ans.author.avatarUrl as string | undefined) || `https://placehold.co/100x100.png?text=${ans.author.name[0]?.toUpperCase() || 'U'}`,
        } : mockUsers[0], // Fallback if author structure is unexpected or needs population
        createdAt: ans.createdAt ? new Date(ans.createdAt).toISOString() : new Date().toISOString(),
        upvotes: ans.upvotes as number || 0,
        downvotes: ans.downvotes as number || 0,
      }));

      questions.push({
        id: qDoc._id.toString(),
        title: qDoc.title as string,
        description: qDoc.description as string,
        tags: (qDoc.tags as Tag[] || []),
        author: author,
        createdAt: new Date(qDoc.createdAt).toISOString(),
        upvotes: qDoc.upvotes as number || 0,
        downvotes: qDoc.downvotes as number || 0,
        answers: populatedAnswers,
      });
    }
    return questions;
  } catch (error) {
    console.error('Error fetching questions by author ID:', error);
    if (error instanceof Error && (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('querySrv ESERVFAIL') ||
        error.message.includes('queryTxt ESERVFAIL') ||
        error.message.includes('bad auth') ||
        error.message.includes('Authentication failed'))) {
      throw new Error(`Database connection issue for getQuestionsByAuthorId: ${error.message}`);
    }
    return []; // Return empty array on other errors
  }
}


export default async function ProfilePage({ params }: ProfilePageProps) {
  let fetchedUser: UserDocument | null = null;
  let userQuestions: Question[] = [];

  try {
    fetchedUser = await getUserById(params.userId);
    if (fetchedUser) {
      userQuestions = await getQuestionsByAuthorId(fetchedUser._id.toString());
    }
  } catch (dbError) {
     console.error("ProfilePage: Database error during data fetching", dbError);
     // Potentially render an error state or allow fallback to notFound if user is null
  }

  if (!fetchedUser) {
    notFound();
  }
  
  const displayUser: UserType = {
    id: fetchedUser._id.toString(),
    name: fetchedUser.name,
    avatarUrl: fetchedUser.avatarUrl || `https://placehold.co/128x128.png?text=${fetchedUser.name[0]?.toUpperCase() || 'U'}`,
  };

  // Mock answers for "My Answers" tab, can be replaced with real data later
  const userAnswersSummary = [
    { questionTitle: mockQuestions[0]?.title || "Sample Question 1", questionId: mockQuestions[0]?.id || "q1", answerSnippet: "This is a summary of my insightful answer..." },
    { questionTitle: mockQuestions[1]?.title || "Sample Question 2", questionId: mockQuestions[1]?.id || "q2", answerSnippet: "Another great answer I provided..." },
  ].filter((_,i) => i < (fetchedUser!._id.toString().charCodeAt(fetchedUser!._id.toString().length -1) % 2 + 1)); 

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
          <TabsTrigger value="answers">My Answers ({userAnswersSummary.length})</TabsTrigger>
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
          {userAnswersSummary.length > 0 ? (
            userAnswersSummary.map((ans, index) => (
              <Card key={index} className="shadow-md">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Answered on question:</p>
                  <CardTitle className="text-lg font-semibold hover:text-primary transition-colors">
                    <a href={`/questions/${ans.questionId}`}>{ans.questionTitle}</a>
                  </CardTitle>
                  <p className="mt-2 text-foreground/80 line-clamp-2">{ans.answerSnippet}</p>
                </CardContent>
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
