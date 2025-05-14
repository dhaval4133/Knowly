import { mockQuestions } from '@/lib/mock-data';
import QuestionCard from '@/components/question/question-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

export default function Home() {
  // In a real app, you'd fetch questions, perhaps with pagination and filtering
  const questions = mockQuestions;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-2">Welcome to Knowly</h1>
        <p className="text-lg text-muted-foreground">
          Your community for sharing knowledge and finding answers.
        </p>
      </div>

      <div className="flex w-full max-w-2xl mx-auto items-center space-x-2">
        <Input type="search" placeholder="Search questions by keyword or tag..." className="flex-grow" />
        <Button type="submit" variant="default">
          <Search className="mr-2 h-4 w-4" /> Search
        </Button>
      </div>

      <div className="space-y-6">
        {questions.map((question) => (
          <QuestionCard key={question.id} question={question} />
        ))}
      </div>

      {questions.length === 0 && (
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-muted-foreground">No questions yet!</h2>
          <p className="text-muted-foreground">Be the first to ask a question and spark a discussion.</p>
        </div>
      )}
    </div>
  );
}
