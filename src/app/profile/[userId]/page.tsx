
import type { User as UserType, Question as PopulatedQuestion } from '@/lib/types';
import { notFound } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import QuestionCard from '@/components/question/question-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MongoClient, Db, ObjectId, WithId } from 'mongodb';
import type { AnswerData, QuestionData } from '@/lib/types';


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

// Specific type for Question documents from MongoDB, extending QuestionData
interface QuestionDBDocument extends QuestionData {
  _id: ObjectId;
  authorId: ObjectId;
   // answers is already in QuestionData as AnswerData[]
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

  try {
    const db = await connectToDatabase();
    const questionsCollection = db.collection<QuestionDBDocument>('questions');
    const usersCollection = db.collection<UserDBDocument>('users'); 
    const authorObjectId = new ObjectId(authorIdString);

    const questionDocs = await questionsCollection.find({ authorId: authorObjectId }).sort({ updatedAt: -1 }).toArray();
    
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

    const answerAuthorIds = new Set<string>();
    questionDocs.forEach(qDoc => {
      (qDoc.answers || []).forEach(ans => {
        if (ans.authorId && ObjectId.isValid(ans.authorId.toString())) {
          answerAuthorIds.add(ans.authorId.toString());
        }
      });
    });
    
    const answerAuthorsMap = new Map<string, UserType>();
    if (answerAuthorIds.size > 0) {
      const answerAuthorObjectIds = Array.from(answerAuthorIds).map(id => new ObjectId(id));
      const answerAuthorDocs = await usersCollection.find({ _id: { $in: answerAuthorObjectIds } }).toArray();
      answerAuthorDocs.forEach(doc => {
        answerAuthorsMap.set(doc._id.toString(), {
          id: doc._id.toString(),
          name: doc.name,
          avatarUrl: doc.avatarUrl || `https://placehold.co/100x100.png?text=${doc.name[0]?.toUpperCase() || 'U'}`,
        });
      });
    }
    const defaultAuthor: UserType = { id: 'unknown', name: 'Unknown User', avatarUrl: 'https://placehold.co/100x100.png?text=U' };


    const populatedQuestions: PopulatedQuestion[] = questionDocs.map(qDoc => {
      const populatedAnswers = (qDoc.answers || []).map(ans => {
         const answerAuthor = answerAuthorsMap.get(ans.authorId.toString()) || defaultAuthor;
        return {
          id: ans._id.toString(),
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
        author: profileAuthor,
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
    console.error('Error fetching questions by author ID for profile:', error);
    if (error instanceof Error && (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv ESERVFAIL') || error.message.includes('Authentication failed'))) {
      throw new Error(`Database connection issue for getQuestionsByAuthorId: ${error.message}`);
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

  try {
    fetchedUser = await getUserById(params.userId);
    if (fetchedUser) {
      userQuestions = await getQuestionsByAuthorId(fetchedUser._id.toString());
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

  const userAnswersSummaryPlaceholder = userQuestions.reduce((acc, q) => acc + q.answers.filter(a => a.author.id === fetchedUser?._id.toString()).length, 0);


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
          <TabsTrigger value="answers" disabled>My Answers ({userAnswersSummaryPlaceholder})</TabsTrigger>
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
            <p className="text-center text-muted-foreground py-8">
              Feature to show your answers to other questions is coming soon!
            </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
