
import type { User as UserType } from '@/lib/types'; // Renamed to avoid conflict
import { notFound } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import QuestionCard from '@/components/question/question-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockQuestions } from '@/lib/mock-data'; // Keep for now for questions/answers
import { MongoClient, Db, ObjectId } from 'mongodb';
// import { cookies } from 'next/headers'; // Can be used for server-side session validation if needed

interface ProfilePageProps {
  params: { userId: string };
}

interface UserDocument extends UserType {
  _id: ObjectId;
  email?: string; // email might not always be public
  createdAt: Date;
  // other fields from your DB user schema
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
      console.warn('Cached MongoDB connection lost for profile, attempting to reconnect...', e);
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
      console.error('Failed to connect to MongoDB for profile:', err);
      cachedClient = null;
      throw err;
    }
  }
  cachedDb = cachedClient.db(MONGODB_DB_NAME);
  return cachedDb;
}

async function getUserById(userId: string): Promise<UserDocument | null> {
  if (!ObjectId.isValid(userId)) {
    console.warn('Invalid userId format for profile:', userId);
    return null;
  }
  try {
    const db = await connectToDatabase();
    const usersCollection = db.collection<UserDocument>('users');
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } }); // Exclude password
    return user;
  } catch (error) {
    console.error('Error fetching user from DB for profile:', error);
    return null; // Or rethrow if you want a hard error page
  }
}


export default async function ProfilePage({ params }: ProfilePageProps) {
  const fetchedUser = await getUserById(params.userId);

  if (!fetchedUser) {
    notFound();
  }
  
  // Adapt fetchedUser to UserType for components if necessary (e.g. _id to id)
  const displayUser: UserType = {
    id: fetchedUser._id.toString(),
    name: fetchedUser.name,
    avatarUrl: fetchedUser.avatarUrl || `https://placehold.co/128x128.png?text=${fetchedUser.name[0]}`, // Default placeholder
  };

  // TODO: Replace mockQuestions and mockAnswers with actual data fetched for this user
  const userQuestions = mockQuestions.filter(q => q.author.id === displayUser.id);
  const userAnswersSummary = [
    { questionTitle: mockQuestions[0]?.title || "Sample Question 1", questionId: mockQuestions[0]?.id || "q1", answerSnippet: "This is a summary of my insightful answer..." },
    { questionTitle: mockQuestions[1]?.title || "Sample Question 2", questionId: mockQuestions[1]?.id || "q2", answerSnippet: "Another great answer I provided..." },
  ].filter((_,i) => i < (fetchedUser._id.toString().charCodeAt(fetchedUser._id.toString().length -1) % 2 + 1));

  const initials = displayUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
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
            {/* TODO: Fetch actual user bio from database */}
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
                    {/* TODO: Make sure question links are correct */}
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
