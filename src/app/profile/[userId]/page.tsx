import { mockUsers, mockQuestions } from '@/lib/mock-data';
import type { User, Question } from '@/lib/types';
import { notFound } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import QuestionCard from '@/components/question/question-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ProfilePageProps {
  params: { userId: string };
}

export default function ProfilePage({ params }: ProfilePageProps) {
  // In a real app, fetch user data based on params.userId
  const user: User | undefined = mockUsers.find(u => u.id === params.userId || params.userId === 'mock-user-id'); // Allow generic mock id

  if (!user && params.userId !== 'mock-user-id') { // If specific ID not found and it's not the generic mock
    notFound();
  }
  
  const currentUser = user || mockUsers[0]; // Fallback to first mock user if generic ID is used

  const userQuestions: Question[] = mockQuestions.filter(q => q.author.id === currentUser.id);
  // Mock user answers - in a real app, these would be fetched
  const userAnswersSummary = [
    { questionTitle: mockQuestions[0].title, questionId: mockQuestions[0].id, answerSnippet: "This is a summary of my insightful answer..." },
    { questionTitle: mockQuestions[1].title, questionId: mockQuestions[1].id, answerSnippet: "Another great answer I provided..." },
  ].filter((_,i) => i < currentUser.id.charCodeAt(currentUser.id.length -1) % 2 + 1); // Randomize answers based on user ID

  const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div className="space-y-8">
      <Card className="shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-accent h-32 md:h-40" data-ai-hint="abstract banner"></div>
        <CardHeader className="flex flex-col items-center text-center -mt-16 md:-mt-20 relative p-6">
          <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-lg">
            <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} data-ai-hint="user avatar" />
            <AvatarFallback className="text-4xl">{initials}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl font-bold mt-4">{currentUser.name}</CardTitle>
          <p className="text-muted-foreground">Member since {new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString() /* Mock join date */}</p>
          {/* Placeholder for bio or other info */}
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
