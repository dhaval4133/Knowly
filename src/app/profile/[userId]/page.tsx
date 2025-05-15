
'use client'; // Make this a client component to use useEffect and useState for current user

import type { User as UserType, Question as PopulatedQuestion, Answer as PopulatedAnswer } from '@/lib/types';
import { notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import QuestionCard from '@/components/question/question-card';
import AnswerCard from '@/components/question/answer-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MongoClient, Db, ObjectId, WithId } from 'mongodb'; // Keep for server-side fetching types
import type { AnswerData, QuestionData } from '@/lib/types'; // Keep for server-side fetching types
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';


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

interface UserAnswerEntry {
  answer: PopulatedAnswer;
  question: {
    id: string;
    title: string;
  };
}

interface CurrentUser {
  userId: string;
  userName: string;
}

// NOTE: The database fetching functions (connectToDatabase, getUserById, etc.)
// remain server-side concerns. They are NOT directly called from the client component.
// This component will fetch initial data via props (or another mechanism for client-side data fetching if preferred).
// For this iteration, we assume initial data (fetchedUser, userQuestions, userAnswers) is passed
// or fetched in a way compatible with client components (e.g., via an API route and useEffect).
// However, to make `showAuthorActions` work, we need the *current logged-in user* on the client.

// These constants are fine here as they might be used by server-side parts of this file if it were a RSC.
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;


// Helper functions for data fetching - these would typically be called on the server or in API routes.
// For the purpose of this client component, we'll assume data is fetched and passed as props or via a client-side fetch.
// The actual database calls would not run in the browser.

async function fetchProfileData(userId: string): Promise<{
    fetchedUser: UserDBDocument | null;
    userQuestions: PopulatedQuestion[];
    userAnswers: UserAnswerEntry[];
    dbConfigured: boolean;
}> {
    if (!MONGODB_URI || !MONGODB_DB_NAME) {
        return { fetchedUser: null, userQuestions: [], userAnswers: [], dbConfigured: false };
    }

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
        if (!cachedClient) {
            cachedClient = new MongoClient(MONGODB_URI!);
            try {
                await cachedClient.connect();
            } catch (err) {
                cachedClient = null;
                throw err;
            }
        }
        cachedDb = cachedClient.db(MONGODB_DB_NAME!);
        return cachedDb;
    }

    async function getUserById(userId: string): Promise<UserDBDocument | null> {
        if (!ObjectId.isValid(userId)) return null;
        try {
            const db = await connectToDatabase();
            return await db.collection<UserDBDocument>('users').findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });
        } catch (error) {
            console.error('Error fetching user from DB for profile page:', error);
            return null;
        }
    }

    async function getQuestionsByAuthorId(authorIdString: string, db: Db, usersCollection: any): Promise<PopulatedQuestion[]> {
        if (!ObjectId.isValid(authorIdString)) return [];
        const defaultAuthor: UserType = { id: 'unknown', name: 'Unknown User', avatarUrl: 'https://placehold.co/100x100.png?text=U' };
        try {
            const questionsCollection = db.collection<QuestionDBDocument>('questions');
            const authorObjectId = new ObjectId(authorIdString);
            const questionDocs = await questionsCollection.find({ authorId: authorObjectId }).sort({ updatedAt: -1 }).toArray();
            const profileAuthorDoc = await usersCollection.findOne({ _id: authorObjectId });
            if (!profileAuthorDoc) return [];

            const profileAuthor: UserType = {
                id: profileAuthorDoc._id.toString(),
                name: profileAuthorDoc.name,
                avatarUrl: profileAuthorDoc.avatarUrl || `https://placehold.co/100x100.png?text=${profileAuthorDoc.name[0]?.toUpperCase() || 'U'}`,
            };

            return questionDocs.map(qDoc => {
                const populatedAnswers = (qDoc.answers || []).map(ans => ({
                    id: typeof ans._id === 'string' ? ans._id : ans._id.toString(),
                    content: ans.content,
                    author: defaultAuthor,
                    createdAt: ans.createdAt && (ans.createdAt instanceof Date || !isNaN(new Date(ans.createdAt).getTime())) ? new Date(ans.createdAt).toISOString() : new Date(0).toISOString(),
                    upvotes: ans.upvotes,
                    downvotes: ans.downvotes,
                }));
                const validCreatedAt = qDoc.createdAt && (qDoc.createdAt instanceof Date || !isNaN(new Date(qDoc.createdAt).getTime())) ? new Date(qDoc.createdAt).toISOString() : new Date(0).toISOString();
                const validUpdatedAt = qDoc.updatedAt && (qDoc.updatedAt instanceof Date || !isNaN(new Date(qDoc.updatedAt).getTime())) ? new Date(qDoc.updatedAt).toISOString() : validCreatedAt;
                return {
                    id: qDoc._id.toString(), title: qDoc.title, description: qDoc.description,
                    tags: qDoc.tags.map(tag => ({ id: tag, name: tag })), author: profileAuthor,
                    createdAt: validCreatedAt, updatedAt: validUpdatedAt,
                    upvotes: qDoc.upvotes, downvotes: qDoc.downvotes, views: qDoc.views, answers: populatedAnswers,
                };
            });
        } catch (error) {
            console.error('Error fetching questions by author ID for profile:', error);
            return [];
        }
    }

    async function getAnswersByAuthorId(profileUserIdString: string, db: Db, usersCollection: any): Promise<UserAnswerEntry[]> {
        if (!ObjectId.isValid(profileUserIdString)) return [];
        try {
            const questionsCollection = db.collection<QuestionDBDocument>('questions');
            const profileUserObjectId = new ObjectId(profileUserIdString);
            const profileUserDoc = await usersCollection.findOne({ _id: profileUserObjectId });
            if (!profileUserDoc) return [];

            const profileUserType: UserType = {
                id: profileUserDoc._id.toString(), name: profileUserDoc.name,
                avatarUrl: profileUserDoc.avatarUrl || `https://placehold.co/100x100.png?text=${profileUserDoc.name[0]?.toUpperCase() || 'U'}`,
            };
            
            const questionDocs = await questionsCollection.find({ "answers.authorId": profileUserIdString }).sort({"answers.createdAt": -1}).toArray();
            const userAnswerEntries: UserAnswerEntry[] = [];

            for (const qDoc of questionDocs) {
                for (const ans of (qDoc.answers || [])) {
                    const answerAuthorIdStr = ans.authorId.toString();
                    if (answerAuthorIdStr === profileUserIdString) {
                        userAnswerEntries.push({
                            answer: {
                                id: typeof ans._id === 'string' ? ans._id : ans._id.toString(), content: ans.content, author: profileUserType,
                                createdAt: ans.createdAt && (ans.createdAt instanceof Date || !isNaN(new Date(ans.createdAt).getTime())) ? new Date(ans.createdAt).toISOString() : new Date(0).toISOString(),
                                upvotes: ans.upvotes, downvotes: ans.downvotes,
                            },
                            question: { id: qDoc._id.toString(), title: qDoc.title },
                        });
                    }
                }
            }
            userAnswerEntries.sort((a, b) => new Date(b.answer.createdAt).getTime() - new Date(a.answer.createdAt).getTime());
            return userAnswerEntries;
        } catch (error) {
            console.error('Error fetching answers by author ID for profile:', error);
            return [];
        }
    }

    try {
        const db = await connectToDatabase();
        const usersCollection = db.collection<UserDBDocument>('users');
        const userDoc = await getUserById(userId);

        if (!userDoc) {
            return { fetchedUser: null, userQuestions: [], userAnswers: [], dbConfigured: true };
        }
        const questions = await getQuestionsByAuthorId(userDoc._id.toString(), db, usersCollection);
        const answers = await getAnswersByAuthorId(userDoc._id.toString(), db, usersCollection);
        return { fetchedUser: userDoc, userQuestions: questions, userAnswers: answers, dbConfigured: true };

    } catch (dbError) {
        console.error("ProfilePage: Database error during data fetching", dbError);
        return { fetchedUser: null, userQuestions: [], userAnswers: [], dbConfigured: true }; // Assume configured but errored
    }
}


export default function ProfilePage({ params }: ProfilePageProps) {
  const [profileData, setProfileData] = useState<{
    fetchedUser: UserDBDocument | null;
    userQuestions: PopulatedQuestion[];
    userAnswers: UserAnswerEntry[];
    dbConfigured: boolean;
  } | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const data = await fetchProfileData(params.userId);
      setProfileData(data);

      // Fetch current logged-in user
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const sessionData = await response.json();
          if (sessionData.success && sessionData.user) {
            setCurrentUser(sessionData.user);
          }
        }
      } catch (error) {
        console.error("Error fetching current user session:", error);
      }
      
      setIsLoading(false);
      if (data.dbConfigured && !data.fetchedUser) {
        // notFound() can only be used in Server Components.
        // For client components, we redirect or show a message.
        // router.replace('/not-found'); // Or display a "User not found" message
      }
    };
    loadData();
  }, [params.userId, router]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-12 w-1/2 mx-auto" />
        <div className="mt-6 space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }
  
  if (!profileData?.dbConfigured) {
     return (
        <div className="text-center py-12 bg-destructive/10 p-6 rounded-lg max-w-2xl mx-auto">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-semibold text-destructive">Database Not Configured</h1>
          <p className="text-muted-foreground mt-2">
            This page requires MongoDB connection details. Please ensure MONGODB_URI and MONGODB_DB_NAME are correctly set up in your environment variables.
          </p>
        </div>
      );
  }

  if (!profileData.fetchedUser) {
    // This is a client component, so notFound() cannot be used directly.
    // Render a "User not found" message or redirect.
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-semibold text-destructive">User Not Found</h1>
        <p className="text-muted-foreground mt-2">The profile you are looking for does not exist.</p>
        <Button asChild className="mt-4">
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }
  
  const { fetchedUser, userQuestions, userAnswers } = profileData;
  const isOwnProfile = currentUser?.userId === fetchedUser._id.toString();

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
              <QuestionCard 
                key={question.id} 
                question={question} 
                showAuthorActions={isOwnProfile} // Pass prop to show actions
              />
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {isOwnProfile ? "You haven't asked any questions yet." : `${displayUser.name} hasn't asked any questions yet.`}
            </p>
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
                            {/* AnswerCard already includes AnswerActions which checks for authorship */}
                            <AnswerCard answer={entry.answer} questionId={entry.question.id} />
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
                 <p className="text-center text-muted-foreground py-8">
                    {isOwnProfile ? "You haven't answered any questions yet." : `${displayUser.name} hasn't answered any questions yet.`}
                 </p>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
